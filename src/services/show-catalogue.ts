import { after } from 'next/server';
import 'server-only';

import { TMDB_POSTER_LARGE_BASE_URL } from '@/consts';

import { createClient } from '@/supabase/server';

import type {
  CatalogueShow,
  ShowDetails,
  ShowMeta,
  ShowSummary,
} from '@/types';

import { getCustomShowImages } from './custom-show-images';
import { fetchAllPages } from './tracking';
import { deriveMarkableEpisodeCount, resolveShowSummaries } from './tv-shows';
import { getViewerId } from './viewer';

export type CatalogueRow = {
  tmdb_show_id: number;
  name: string;
  year: string | null;
  genres: string[];
  poster_path: string | null;
  network: string | null;
  markable_episode_count: number;
  average_runtime: number | null;
};

// Structural, not `TMDBSeriesDetailsRaw`, because that type marks `name` and
// `first_air_date` as required — and the whole job of this function is to
// accept a response that might not be complete. `TMDBSeriesDetailsRaw` is
// assignable to this.
export type CatalogueSource = {
  name?: string;
  first_air_date?: string;
  poster_path?: string | null;
  genres?: { id: number; name: string }[];
  episode_run_time?: number[];
  seasons?: { season_number: number; episode_count: number | null }[];
  last_episode_to_air?: {
    season_number: number;
    episode_number: number;
    runtime?: number | null;
  } | null;
  networks?: { name: string }[];
};

// Returns null for any response not complete enough to trust. This cache has
// no invalidation, so a wrong row persists forever while a missing row is
// harmless and self-heals on the next render.
export function catalogueRowFromTmdb(
  id: number,
  json: CatalogueSource | null | undefined
): CatalogueRow | null {
  if (!json) return null;

  const name = json.name?.trim();
  if (!name) return null;

  return {
    tmdb_show_id: id,
    name,
    year: json.first_air_date ? json.first_air_date.slice(0, 4) : null,
    genres: (json.genres ?? []).map((genre) => genre.name),
    poster_path: json.poster_path ?? null,
    network: json.networks?.[0]?.name ?? null,
    markable_episode_count: deriveMarkableEpisodeCount({
      seasons: (json.seasons ?? []).map((season) => ({
        seasonNumber: season.season_number,
        episodeCount: season.episode_count,
      })),
      lastAired: json.last_episode_to_air
        ? {
            seasonNumber: json.last_episode_to_air.season_number,
            episodeNumber: json.last_episode_to_air.episode_number,
          }
        : null,
    }),
    // episode_run_time is frequently empty on TMDB nowadays; fall back to
    // the last aired episode's own runtime — matching
    // fetchShowSummaryFromTmdb's own fallback so the stored value agrees
    // with what the app computes today.
    average_runtime:
      json.episode_run_time?.[0] ?? json.last_episode_to_air?.runtime ?? null,
  };
}

// The uncached wrappers hold a mapped ShowSummary, not raw TMDB JSON —
// the raw response is trapped behind a 'use cache' boundary that cannot
// write to the database. Every catalogue field is recoverable from the
// summary, so map back rather than re-fetching.
export function catalogueRowFromSummary(
  summary: ShowSummary | null | undefined
): CatalogueRow | null {
  if (!summary) return null;

  const name = summary.name?.trim();
  if (!name) return null;

  return {
    tmdb_show_id: summary.id,
    name,
    year: summary.year,
    genres: summary.genres,
    poster_path: summary.posterUrl
      ? summary.posterUrl.replace(TMDB_POSTER_LARGE_BASE_URL, '')
      : null,
    network: summary.network,
    markable_episode_count: summary.markableEpisodeCount,
    average_runtime: summary.averageRuntime,
  };
}

// The show page and tracking page go through the full-details tier, which
// holds a different shape than the summary tier. Same row, third adapter
// onto the one shared episode-count rule.
export function catalogueRowFromDetails(
  id: number,
  details: ShowDetails,
  meta: ShowMeta
): CatalogueRow | null {
  const name = details.name?.trim();
  if (!name) return null;

  return {
    tmdb_show_id: id,
    name,
    year: details.year,
    genres: details.genres,
    poster_path: details.posterUrl
      ? details.posterUrl.replace(TMDB_POSTER_LARGE_BASE_URL, '')
      : null,
    network: details.network,
    markable_episode_count: deriveMarkableEpisodeCount({
      seasons: meta.seasons.map((season) => ({
        seasonNumber: season.seasonNumber,
        episodeCount: season.episodeCount,
      })),
      lastAired: meta.latestEpisode
        ? {
            seasonNumber: meta.latestEpisode.seasonNumber,
            episodeNumber: meta.latestEpisode.episodeNumber,
          }
        : null,
    }),
    average_runtime: details.averageRuntime,
  };
}

// One round-trip regardless of batch size. The RPC skips rows refreshed
// within the last hour, so a page re-render writes nothing.
//
// Never throws: a catalogue write is an optimisation, and failing it must
// not break the render that triggered it.
export async function upsertCatalogueShows(
  rows: CatalogueRow[]
): Promise<void> {
  if (rows.length === 0) return;

  // Postgres raises 21000 ("ON CONFLICT DO UPDATE command cannot affect row
  // a second time") when one statement's VALUES target the same conflict
  // key twice, and that error discards the whole batch. Two TV Time shows
  // can resolve to the same TMDB id, so dedupe by tmdb_show_id here, keeping
  // the last occurrence, before the row ever reaches the RPC.
  const deduped = new Map<number, CatalogueRow>();
  for (const row of rows) {
    deduped.set(row.tmdb_show_id, row);
  }
  const dedupedRows = Array.from(deduped.values());

  try {
    // RLS grants writes to `authenticated` only, and several call sites are
    // reachable anonymously — the home page, show pages via generateMetadata,
    // and public profiles. Attempting the write there is a guaranteed-to-fail
    // round-trip on every anonymous request, so skip it. The parameter-level
    // `viewerId` some callers pass is not a usable signal: the home page and
    // generateMetadata never pass one even when the visitor is signed in.
    const viewerId = await getViewerId();
    if (!viewerId) return;

    const supabase = await createClient();
    const { error } = await supabase.rpc('upsert_show_catalogue', {
      p_rows: dedupedRows,
    });
    if (error) {
      // 42501 means RLS rejected the write despite the session check above
      // (e.g. a race where the session expired mid-request) — an expected
      // permission condition, not an anomaly worth a warning line.
      if (error.code !== '42501') {
        console.warn('[show-catalogue] upsert failed', error.message);
      }
    }
  } catch (err) {
    console.warn('[show-catalogue] upsert threw', err);
  }
}

export function catalogueShowFromRow(row: CatalogueRow): CatalogueShow {
  return {
    id: row.tmdb_show_id,
    name: row.name,
    year: row.year,
    genres: row.genres,
    posterUrl: row.poster_path
      ? `${TMDB_POSTER_LARGE_BASE_URL}${row.poster_path}`
      : null,
    markableEpisodeCount: row.markable_episode_count,
  };
}

export function catalogueShowFromSummary(summary: ShowSummary): CatalogueShow {
  return {
    id: summary.id,
    name: summary.name,
    year: summary.year,
    genres: summary.genres,
    posterUrl: summary.posterUrl,
    markableEpisodeCount: summary.markableEpisodeCount,
  };
}

// Pure, so the fallback selection is testable without a database.
export function selectMissingIds(
  requested: number[],
  cached: Set<number>
): number[] {
  const missing: number[] = [];
  const seen = new Set<number>();
  for (const id of requested) {
    if (cached.has(id) || seen.has(id)) continue;
    seen.add(id);
    missing.push(id);
  }
  return missing;
}

// A show_catalogue row alone is not enough: markableEpisodeCount is derived
// exclusively from season_catalogue now, so a show with a catalogue row but
// no season rows (e.g. imported before season_catalogue existed, or a write
// that landed one table and not the other) is just as much a cache miss as a
// show absent from show_catalogue entirely. Union, not intersection: either
// gap alone is enough to warrant a refetch, and resolveShowSummaries writes
// both tables in one call regardless of which gap sent it there.
export function selectShowsNeedingRefetch(
  requested: number[],
  cachedIds: Set<number>,
  idsWithSeasonTotals: Set<number>
): number[] {
  const needsRefetch: number[] = [];
  const seen = new Set<number>();
  for (const id of requested) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (!cachedIds.has(id) || !idsWithSeasonTotals.has(id)) {
      needsRefetch.push(id);
    }
  }
  return needsRefetch;
}

// A season still airing can only be wrong for as long as it takes TMDB to
// catch up with reality — 12h comfortably covers a weekly release cadence
// without re-fetching a show on every single render.
const STALE_SEASON_MS = 12 * 60 * 60 * 1000;

// Scheduled via after() from getCatalogueShows, so it never delays the
// render that discovered the staleness. Bounded twice: to the ids that
// render actually asked for, and — within those — to shows with a season
// still airing whose row hasn't been touched in STALE_SEASON_MS. Every
// failure is caught here; a missed refresh must degrade to "still a bit
// stale", never to a broken page.
async function refreshStaleSeasons(showIds: number[]): Promise<void> {
  try {
    const supabase = await createClient();
    const staleBefore = new Date(Date.now() - STALE_SEASON_MS).toISOString();
    const { data, error } = await supabase
      .from('season_catalogue')
      .select('tmdb_show_id')
      .in('tmdb_show_id', showIds)
      .eq('finished_airing', false)
      .lt('updated_at', staleBefore);

    if (error) {
      console.warn(
        '[show-catalogue] stale-season read failed',
        error.message
      );
      return;
    }

    const staleIds = Array.from(
      new Set((data ?? []).map((row) => row.tmdb_show_id))
    );
    if (staleIds.length === 0) return;

    // No viewerId: this is a background cache refresh, not a viewer-facing
    // fetch, so there is no per-viewer image override to apply.
    await resolveShowSummaries(staleIds);
  } catch (err) {
    console.warn('[show-catalogue] refresh threw', err);
  }
}

// One query for everything the catalogue knows, then TMDB for the rest.
//
// The fallback is the migration path, not an edge case: the catalogue starts
// empty, so on day one it carries every show and behaviour is identical to
// before. resolveShowSummaries writes what it fetches into the catalogue, so
// each miss heals itself and the fallback shrinks toward nothing. It is also
// what covers shows tracked in the app but absent from a TV Time import.
export async function getCatalogueShows(
  ids: number[],
  viewerId?: string | null
): Promise<Map<number, CatalogueShow>> {
  const result = new Map<number, CatalogueShow>();
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('show_catalogue')
    .select('tmdb_show_id, name, year, genres, poster_path')
    .in('tmdb_show_id', uniqueIds);

  // show_catalogue is a cache. A read failure must never break a page that
  // worked before the cache existed — degrade to a total miss and let the
  // TMDB fallback below serve everything, as it did before.
  if (error) {
    console.warn('[show-catalogue] read failed', error.message);
  } else {
    for (const row of data ?? []) {
      result.set(row.tmdb_show_id, {
        id: row.tmdb_show_id,
        name: row.name,
        year: row.year,
        genres: row.genres,
        posterUrl: row.poster_path
          ? `${TMDB_POSTER_LARGE_BASE_URL}${row.poster_path}`
          : null,
        // Placeholder, replaced unconditionally by the season_totals fold
        // below — every id in `result`, catalogue-sourced or fallback-
        // sourced, gets its real value from there before this returns.
        markableEpisodeCount: 0,
      });
    }
  }

  // markableEpisodeCount comes from season_catalogue exclusively now, not
  // show_catalogue.markable_episode_count — that column is written once and
  // never refreshed, so a cached row could silently disagree with TMDB
  // forever. sum(aired_count) here is exact, and — because it's read fresh
  // on every call — self-correcting once season_catalogue itself is kept
  // current by upsertSeasonCatalogue and the refresh below.
  //
  // This must be an RPC, not a plain `.select()` on season_catalogue: that
  // table holds one row per season, so a page's worth of shows (each with
  // several seasons) can comfortably exceed PostgREST's 1000-row cap.
  // season_totals groups server-side into one row per show, so the result
  // is bounded by uniqueIds.length regardless of how many seasons exist —
  // but that bound can itself exceed PostgREST's 1000-row cap on a large
  // enough batch, and the cap applies to set-returning RPCs exactly like it
  // does table reads, so this pages through fetchAllPages the same way.
  //
  // Queried before the fallback below (not after) because the fallback set
  // itself depends on which ids this returns: a show with a show_catalogue
  // row but no season_totals entry is as much a cache miss as a show with
  // no catalogue row at all — see selectShowsNeedingRefetch.
  let totalsErrorMessage: string | null = null;
  const totals = await fetchAllPages(async (limit, offset) => {
    const { data, error } = await supabase.rpc('season_totals', {
      p_show_ids: uniqueIds,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      totalsErrorMessage = error.message;
      return [];
    }
    return data ?? [];
  });
  if (totalsErrorMessage) {
    console.warn(
      '[show-catalogue] season totals read failed',
      totalsErrorMessage
    );
  }
  // On a totals-read failure, degrade the same way the catalogue-read
  // failure above does: treat every id as lacking season totals so the
  // fallback below covers everything, rather than trusting a partial or
  // absent result and freezing every show's count at 0.
  const idsWithSeasonTotals = new Set(
    totalsErrorMessage ? [] : totals.map((row) => row.tmdb_show_id)
  );

  const needsRefetch = selectShowsNeedingRefetch(
    uniqueIds,
    new Set(result.keys()),
    idsWithSeasonTotals
  );
  if (needsRefetch.length > 0) {
    const summaries = await resolveShowSummaries(needsRefetch, viewerId);
    for (const [id, summary] of summaries) {
      result.set(id, catalogueShowFromSummary(summary));
    }
  }

  if (!totalsErrorMessage) {
    const airedTotalById = new Map(
      totals.map((row) => [row.tmdb_show_id, row.aired_total])
    );
    for (const [id, show] of result) {
      // A show with no season_catalogue rows (nothing imported yet, or a
      // show that never got a details/summary fetch) has no entry here and
      // falls back to 0 — the same "unknown" state a show missing from
      // show_catalogue entirely is in until its first fetch.
      result.set(id, {
        ...show,
        markableEpisodeCount: airedTotalById.get(id) ?? 0,
      });
    }
  }

  // Bounded refresh-on-read: closes the staleness gap markable_episode_count
  // used to have by letting an airing show's season data self-correct
  // instead of being frozen at whatever it was on first write. Scheduled
  // after the response so it never adds latency to this render.
  after(() => refreshStaleSeasons(uniqueIds));

  // Catalogue rows carry TMDB's poster. A viewer's own override is overlaid
  // here, never written into the shared table. Rows that came through the
  // fallback already have it applied by resolveShowSummaries; applying it
  // again is a no-op.
  if (viewerId) {
    const overrides = await getCustomShowImages(viewerId, uniqueIds);
    for (const [id, override] of overrides) {
      const show = result.get(id);
      if (show && override.customPosterUrl) {
        result.set(id, { ...show, posterUrl: override.customPosterUrl });
      }
    }
  }

  return result;
}
