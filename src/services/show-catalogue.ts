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
import { deriveMarkableEpisodeCount, resolveShowSummaries } from './tv-shows';
import { getViewerId } from './viewer';

export type CatalogueRow = {
  tmdb_show_id: number;
  name: string;
  year: string | null;
  genres: string[];
  poster_path: string | null;
  markable_episode_count: number;
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
  seasons?: { season_number: number; episode_count: number | null }[];
  last_episode_to_air?: {
    season_number: number;
    episode_number: number;
  } | null;
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
    markable_episode_count: summary.markableEpisodeCount,
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
    .select(
      'tmdb_show_id, name, year, genres, poster_path, markable_episode_count'
    )
    .in('tmdb_show_id', uniqueIds);

  // show_catalogue is a cache. A read failure must never break a page that
  // worked before the cache existed — degrade to a total miss and let the
  // TMDB fallback below serve everything, as it did before.
  if (error) {
    console.warn('[show-catalogue] read failed', error.message);
  } else {
    for (const row of data ?? []) {
      result.set(row.tmdb_show_id, catalogueShowFromRow(row));
    }
  }

  const missing = selectMissingIds(uniqueIds, new Set(result.keys()));
  if (missing.length > 0) {
    const summaries = await resolveShowSummaries(missing, viewerId);
    for (const [id, summary] of summaries) {
      result.set(id, catalogueShowFromSummary(summary));
    }
  }

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
