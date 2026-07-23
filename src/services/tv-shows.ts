import { cacheLife, cacheTag } from 'next/cache';
import { after } from 'next/server';
import 'server-only';

import {
  TMDB_API_BASE_URL,
  TMDB_BACKDROP_BASE_URL,
  TMDB_BACKDROP_LARGE_BASE_URL,
  TMDB_IMAGE_BASE_URL,
  TMDB_POSTER_LARGE_BASE_URL,
  TMDB_PROVIDER_LOGO_BASE_URL,
  WATCH_PROVIDER_PRIORITY_COUNTRIES,
} from '@/consts';

import type {
  SeasonEpisode,
  ShowBackdropImage,
  ShowDetails,
  ShowMeta,
  ShowSummary,
  ShowSummarySeason,
  TMDBEpisodeGroupDetail,
  TMDBEpisodeGroupListEntry,
  TMDBSeasonDetailRaw,
  TMDBSeriesDetailsRaw,
  TMDBShowImagesRaw,
  TMDBWatchProvidersRaw,
  WatchProvider,
} from '@/types';

import {
  ANIME_GENRE_ID,
  getCountryDisplayName,
  getLanguageDisplayName,
  isAnime,
  mapWithConcurrency,
} from '@/utils';

import { getCustomShowImages } from './custom-show-images';
import { seasonRowsFromTmdb, upsertSeasonCatalogue } from './season-catalogue';
import type { SeasonRow } from './season-catalogue';
import {
  catalogueRowFromDetails,
  catalogueRowFromSummary,
  upsertCatalogueShows,
} from './show-catalogue';
import type { CatalogueRow } from './show-catalogue';

export async function getTrendingTvShowIds(): Promise<number[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('trending-tv-show-ids');

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/trending/tv/week?api_key=${apiKey}&language=en-US`
    );

    if (!res.ok) {
      console.warn(`[tv-shows] TMDB trending ${res.status}: ${res.statusText}`);
      return [];
    }

    const json: { results?: { id: number }[] } = await res.json();
    return (json.results ?? []).map((show) => show.id);
  } catch (err) {
    console.warn('[tv-shows] trending fetch failed', err);
    return [];
  }
}

// Discover-by-popularity rather than filtering /trending/tv into anime: the
// trending feed alone is often too sparse in anime to fill a carousel row.
export async function getTrendingAnimeShowIds(): Promise<number[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('trending-anime-show-ids');

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/discover/tv?api_key=${apiKey}&language=en-US&with_genres=${ANIME_GENRE_ID}&with_origin_country=JP&sort_by=popularity.desc&page=1`
    );

    if (!res.ok) {
      console.warn(
        `[tv-shows] TMDB anime discover ${res.status}: ${res.statusText}`
      );
      return [];
    }

    const json: { results?: { id: number }[] } = await res.json();
    return (json.results ?? []).map((show) => show.id);
  } catch (err) {
    console.warn('[tv-shows] anime discover fetch failed', err);
    return [];
  }
}

// watch_region alone does not filter or re-rank /discover/tv results — it
// only annotates each result with provider metadata. Pairing it with
// with_watch_monetization_types=flatrate actually restricts results to
// shows with a subscription-streaming offering in that region before
// sorting by popularity, which is what makes this country-specific instead
// of silently returning the same global list for every country.
export async function getPopularTvShowIdsForCountry(
  country: string
): Promise<number[]> {
  'use cache';
  // TMDB's watch_region is case-sensitive (a lowercase code returns no
  // results) — normalize once so the fetch and the cache tag always agree.
  const normalizedCountry = country.toUpperCase();
  cacheLife('hours');
  cacheTag(`popular-tv-${normalizedCountry}`);

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/discover/tv?api_key=${apiKey}&language=en-US&watch_region=${normalizedCountry}&with_watch_monetization_types=flatrate&sort_by=popularity.desc&page=1`
    );

    if (!res.ok) {
      console.warn(
        `[tv-shows] TMDB popular-by-country ${res.status}: ${res.statusText}`
      );
      return [];
    }

    const json: { results?: { id: number }[] } = await res.json();
    return (json.results ?? []).map((show) => show.id);
  } catch (err) {
    console.warn('[tv-shows] popular-by-country fetch failed', err);
    return [];
  }
}

export async function getDiscoverTvIdsByGenre(
  genreId: number
): Promise<number[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(`popular-tv-genre-${genreId}`);

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/discover/tv?api_key=${apiKey}&language=en-US&with_genres=${genreId}&sort_by=popularity.desc&page=1`
    );

    if (!res.ok) {
      console.warn(
        `[tv-shows] TMDB discover-by-genre ${res.status}: ${res.statusText}`
      );
      return [];
    }

    const json: { results?: { id: number }[] } = await res.json();
    return (json.results ?? []).map((show) => show.id);
  } catch (err) {
    console.warn('[tv-shows] discover-by-genre fetch failed', err);
    return [];
  }
}

// cacheRetrySalt is undefined on every normal call, so it changes nothing
// about the normal cache key/behaviour. getTmdbShowFullDetails passes a
// fixed salt ('retry') on its one retry attempt only — see the comment on
// that function for why a same-arguments re-call doesn't actually re-fetch
// under Cache Components' request-scoped memoization of 'use cache' calls.
export async function getTmdbSeasonEpisodes(
  showId: number,
  seasonNumber: number,
  cacheRetrySalt?: string
): Promise<SeasonEpisode[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('tmdb-season-episodes');

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  // Deliberately not wrapped in try/catch: this function is 'use cache', so
  // returning a fallback value here (as earlier revisions did) caches that
  // fallback for hours. Throwing instead means nothing gets cached, and the
  // uncached caller (getTmdbShowFullDetails) is responsible for degrading.
  const res = await fetch(
    `${TMDB_API_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${apiKey}&language=en-US${
      cacheRetrySalt ? `&_retry=${encodeURIComponent(cacheRetrySalt)}` : ''
    }`
  );

  if (!res.ok) {
    throw new Error(`[tv-shows] TMDB season ${res.status}: ${res.statusText}`);
  }

  const json: TMDBSeasonDetailRaw = await res.json();

  return (json.episodes ?? []).map((episode) => ({
    episodeNumber: episode.episode_number,
    name:
      episode.name === `Episode ${episode.episode_number}`
        ? 'TBA'
        : episode.name,
    overview: episode.overview,
    runtime: episode.runtime,
    airDate: episode.air_date,
    imageUrl: episode.still_path
      ? `${TMDB_BACKDROP_BASE_URL}${episode.still_path}`
      : null,
    arcName: null,
  }));
}

export async function getTmdbAnimeArcNames(
  showId: number
): Promise<Map<string, string> | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('tmdb-anime-arc-names');

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return null;
  }

  try {
    const listRes = await fetch(
      `${TMDB_API_BASE_URL}/tv/${showId}/episode_groups?api_key=${apiKey}`
    );

    if (!listRes.ok) {
      console.warn(
        `[tv-shows] TMDB episode groups ${listRes.status}: ${listRes.statusText}`
      );
      return null;
    }

    const listJson: { results?: TMDBEpisodeGroupListEntry[] } =
      await listRes.json();
    const airedOrderGroups = (listJson.results ?? []).filter(
      (group) => group.type === 1
    );

    if (airedOrderGroups.length === 0) return null;

    const chosen =
      airedOrderGroups.find((group) =>
        group.name.toLowerCase().includes('tvdb')
      ) ??
      airedOrderGroups.reduce((best, group) =>
        group.episode_count > best.episode_count ? group : best
      );

    const detailRes = await fetch(
      `${TMDB_API_BASE_URL}/tv/episode_group/${chosen.id}?api_key=${apiKey}`
    );

    if (!detailRes.ok) {
      console.warn(
        `[tv-shows] TMDB episode group detail ${detailRes.status}: ${detailRes.statusText}`
      );
      return null;
    }

    const detailJson: TMDBEpisodeGroupDetail = await detailRes.json();
    const arcNames = new Map<string, string>();

    for (const group of detailJson.groups ?? []) {
      for (const episode of group.episodes ?? []) {
        arcNames.set(
          `${episode.season_number}-${episode.episode_number}`,
          group.name
        );
      }
    }

    return arcNames;
  } catch (err) {
    console.warn('[tv-shows] episode groups fetch failed', err);
    return null;
  }
}

// Approximate "episodes aired so far" from the show's own last-aired-episode
// pointer instead of fetching every season's episode list: every regular
// season before it counts in full, and the last-aired season counts up to
// (and including) its own episode number.
//
// Takes a normalised shape because the summary tier, the full-details tier
// and the catalogue mapper each hold this data differently. Two derivations
// that disagreed would show as a progress bar that changes as you navigate.
export function deriveMarkableEpisodeCount(input: {
  seasons: { seasonNumber: number; episodeCount: number | null }[];
  lastAired: { seasonNumber: number; episodeNumber: number } | null;
}): number {
  const seasons = input.seasons.filter((season) => season.seasonNumber > 0);
  const lastAired = input.lastAired;
  if (!lastAired) return 0;

  if (lastAired.seasonNumber > 0) {
    let count = 0;
    for (const season of seasons) {
      if (season.seasonNumber < lastAired.seasonNumber) {
        count += season.episodeCount ?? 0;
      } else if (season.seasonNumber === lastAired.seasonNumber) {
        count += lastAired.episodeNumber;
      }
    }
    return count;
  }

  // lastAired is a season-0 special — specials release between/after
  // completed regular seasons, so treat every known regular season's full
  // episode count as already aired.
  return seasons.reduce((sum, season) => sum + (season.episodeCount ?? 0), 0);
}

// One TMDB request per show: everything PosterCard/carousels need to render
// a poster tile, without the season/episode-group fan-out that
// getTmdbShowFullDetails does. Full details remain a separate, heavier
// tier for the show page and tracking views that need per-episode data.
async function fetchShowSummaryFromTmdb(
  id: number
): Promise<{ summary: ShowSummary; seasonRows: SeasonRow[] } | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('tmdb-show-summary');

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return null;
  }

  // Deliberately not wrapped in try/catch: this function is 'use cache', so
  // returning a fallback value here (as earlier revisions did) caches that
  // fallback for hours. Throwing instead means nothing gets cached, and the
  // uncached callers (getShowSummary, resolveShowSummaries) are responsible
  // for degrading.
  const res = await fetch(
    `${TMDB_API_BASE_URL}/tv/${id}?api_key=${apiKey}&language=en-US`
  );

  if (!res.ok) {
    throw new Error(`[tv-shows] TMDB summary ${res.status}: ${res.statusText}`);
  }

  const json: TMDBSeriesDetailsRaw = await res.json();

  const showIsAnime = isAnime(
    (json.genres ?? []).map((genre) => genre.id),
    json.origin_country ?? []
  );

  const seasons: ShowSummarySeason[] = (json.seasons ?? [])
    .filter((season) => season.season_number > 0)
    .map((season) => ({
      seasonNumber: season.season_number,
      episodeCount: season.episode_count,
    }));

  const markableEpisodeCount = deriveMarkableEpisodeCount({
    seasons,
    lastAired: json.last_episode_to_air
      ? {
          seasonNumber: json.last_episode_to_air.season_number,
          episodeNumber: json.last_episode_to_air.episode_number,
        }
      : null,
  });

  // Derived from the raw JSON, not from `seasons`/meta above: those strip
  // season 0 and lose next-episode context that seasonRowsFromTmdb needs.
  const seasonRows = seasonRowsFromTmdb(id, json);

  return {
    summary: {
      id,
      name: json.name,
      posterUrl: json.poster_path
        ? `${TMDB_POSTER_LARGE_BASE_URL}${json.poster_path}`
        : null,
      bannerUrl: json.backdrop_path
        ? `${TMDB_BACKDROP_LARGE_BASE_URL}${json.backdrop_path}`
        : null,
      markableEpisodeCount,
      year: json.first_air_date ? json.first_air_date.slice(0, 4) : null,
      genres: (json.genres ?? []).map((genre) => genre.name),
      network: json.networks?.[0]?.name ?? null,
      isAnime: showIsAnime,
      // episode_run_time is frequently empty on TMDB nowadays; fall back to
      // the last aired episode's own runtime.
      averageRuntime:
        json.episode_run_time?.[0] ?? json.last_episode_to_air?.runtime ?? null,
      seasons,
    },
    seasonRows,
  };
}

function withCustomImages(
  summary: ShowSummary,
  override:
    | { customPosterUrl: string | null; customBannerUrl: string | null }
    | undefined
): ShowSummary {
  if (!override) return summary;
  return {
    ...summary,
    posterUrl: override.customPosterUrl ?? summary.posterUrl,
    bannerUrl: override.customBannerUrl ?? summary.bannerUrl,
  };
}

// viewerId is optional and, when provided, overlays that viewer's custom
// poster/banner (from show_tracking) onto the globally-cached TMDB result.
// This overlay MUST happen here, outside fetchShowSummaryFromTmdb's cached
// scope — baking it into the cached function would leak one viewer's
// custom image to every other viewer who triggers the same cache entry.
export async function getShowSummary(
  id: number,
  viewerId?: string | null
): Promise<ShowSummary | null> {
  let result: Awaited<ReturnType<typeof fetchShowSummaryFromTmdb>>;
  try {
    result = await fetchShowSummaryFromTmdb(id);
  } catch (err) {
    console.warn('[tv-shows] summary fetch failed', err);
    return null;
  }
  if (!result) return null;
  const { summary } = result;
  if (!viewerId) return summary;

  const overrides = await getCustomShowImages(viewerId, [id]);
  return withCustomImages(summary, overrides.get(id));
}

// cacheRetrySalt is undefined on every normal call — see the comment on
// getTmdbShowFullDetails for why its one retry attempt passes a fixed salt
// instead of just calling this function again with the same `id`.
async function fetchShowFullDetailsFromTmdb(
  id: number,
  cacheRetrySalt?: string
): Promise<{
  details: ShowDetails;
  meta: ShowMeta;
  seasonRows: SeasonRow[];
} | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('tmdb-show-full-details');

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return null;
  }

  let json: TMDBSeriesDetailsRaw;
  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/tv/${id}?api_key=${apiKey}&language=en-US&append_to_response=credits,content_ratings,recommendations`
    );

    if (!res.ok) {
      console.warn(`[tv-shows] TMDB details ${res.status}: ${res.statusText}`);
      return null;
    }

    json = await res.json();
  } catch (err) {
    console.warn('[tv-shows] details fetch failed', err);
    return null;
  }

  // Deliberately outside the try/catch above: a throw from
  // getTmdbSeasonEpisodes (via mapWithConcurrency below) must propagate out
  // of this cached function uncaught, so nothing gets cached when TMDB
  // refuses a season request. getTmdbShowFullDetails (uncached) is
  // responsible for catching it and degrading to null.
  const showIsAnime = isAnime(
    (json.genres ?? []).map((genre) => genre.id),
    json.origin_country ?? []
  );

  const details: ShowDetails = {
    name: json.name,
    originalName: json.original_name,
    overview: json.overview,
    year: json.first_air_date ? json.first_air_date.slice(0, 4) : null,
    bannerUrl: json.backdrop_path
      ? `${TMDB_BACKDROP_LARGE_BASE_URL}${json.backdrop_path}`
      : null,
    posterUrl: json.poster_path
      ? `${TMDB_POSTER_LARGE_BASE_URL}${json.poster_path}`
      : null,
    genres: (json.genres ?? []).map((genre) => genre.name),
    network: json.networks?.[0]?.name ?? null,
    isAnime: showIsAnime,
    cast: (json.credits?.cast ?? []).map((member) => ({
      actorId: member.id,
      actorName: member.name,
      character: member.character,
      imageUrl: member.profile_path
        ? `${TMDB_POSTER_LARGE_BASE_URL}${member.profile_path}`
        : null,
    })),
    // TMDB's "Returning Series" reads as jargon in the UI — display it as
    // "Ongoing" instead.
    status:
      json.status === 'Returning Series' ? 'Ongoing' : (json.status ?? null),
    // episode_run_time is frequently empty on TMDB nowadays; fall back to
    // the last aired episode's own runtime.
    averageRuntime:
      json.episode_run_time?.[0] ?? json.last_episode_to_air?.runtime ?? null,
    originalLanguage: getLanguageDisplayName(json.original_language),
    originalCountry: getCountryDisplayName(json.origin_country?.[0]),
    contentRating:
      json.content_ratings?.results?.find((r) => r.iso_3166_1 === 'US')
        ?.rating ?? null,
    premiereDate: json.first_air_date ?? null,
    lastAiredDate: json.last_air_date ?? null,
    nextEpisodeDate: json.next_episode_to_air?.air_date ?? null,
  };

  // Arc-name dividers (SeasonAccordion) are opt-in per show: only fetched
  // for anime, and only actually used if TMDB has a community-maintained
  // "aired order" episode group for it (getTmdbAnimeArcNames returns null
  // otherwise, e.g. for Breaking Bad, which has no such group at all).
  const arcNames = showIsAnime ? await getTmdbAnimeArcNames(id) : null;

  const lastEpisode = json.last_episode_to_air;
  const nextEpisode = json.next_episode_to_air;

  const sortedSeasons = (json.seasons ?? [])
    .slice()
    // Regular seasons in order, "Specials" (season_number 0) last.
    .sort((a, b) => {
      const rank = (n: number) => (n === 0 ? Infinity : n);
      return rank(a.season_number) - rank(b.season_number);
    });

  // Capped at 6 (rather than the summary fan-out's 10) because this runs
  // *inside* a per-show fan-out (tracking page, recommendations) — the two
  // multiply, and 6 was chosen to keep that product well under TMDB's
  // ~50/sec limit.
  const seasons = await mapWithConcurrency(sortedSeasons, 6, async (season) => ({
    name: season.name,
    seasonNumber: season.season_number,
    airDate: season.air_date,
    episodeCount: season.episode_count,
    posterUrl: season.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${season.poster_path}`
      : null,
    episodes: (
      await getTmdbSeasonEpisodes(id, season.season_number, cacheRetrySalt)
    ).map(
      (episode) => ({
        ...episode,
        arcName:
          arcNames?.get(`${season.season_number}-${episode.episodeNumber}`) ??
          null,
      })
    ),
  }));

  const meta: ShowMeta = {
    numberOfSeasons: json.number_of_seasons ?? null,
    numberOfEpisodes: json.number_of_episodes ?? null,
    seasons,
    latestEpisode:
      lastEpisode && lastEpisode.season_number > 0
        ? {
            name: lastEpisode.name,
            overview: lastEpisode.overview,
            seasonNumber: lastEpisode.season_number,
            episodeNumber: lastEpisode.episode_number,
            airDate: lastEpisode.air_date,
            runtime: lastEpisode.runtime,
            imageUrl: lastEpisode.still_path
              ? `${TMDB_BACKDROP_BASE_URL}${lastEpisode.still_path}`
              : null,
          }
        : null,
    nextEpisode:
      nextEpisode && nextEpisode.season_number > 0
        ? {
            name: nextEpisode.name,
            overview: nextEpisode.overview,
            seasonNumber: nextEpisode.season_number,
            episodeNumber: nextEpisode.episode_number,
            airDate: nextEpisode.air_date,
            runtime: nextEpisode.runtime,
            imageUrl: nextEpisode.still_path
              ? `${TMDB_BACKDROP_BASE_URL}${nextEpisode.still_path}`
              : null,
          }
        : null,
    similar: (json.recommendations?.results ?? []).slice(0, 12).map((s) => ({
      id: s.id,
      name: s.name,
      posterUrl: s.poster_path
        ? `${TMDB_POSTER_LARGE_BASE_URL}${s.poster_path}`
        : null,
      matchPercentage:
        typeof s.vote_average === 'number'
          ? Math.round(s.vote_average * 10)
          : null,
    })),
  };

  // Derived from the raw JSON, not from `meta` above: meta.latestEpisode
  // and meta.nextEpisode are nulled out whenever that episode's
  // season_number is 0, which would make a show whose most recent aired
  // episode is a special look like it never aired anything.
  const seasonRows = seasonRowsFromTmdb(id, json);

  return { details, meta, seasonRows };
}

// viewerId is optional and, when provided, overlays that viewer's custom
// poster/banner onto both the show's own details AND every "similar show"
// entry in meta.similar — one bulk show_tracking query covers all of them.
// Same non-cached-scope rule as getShowSummary above.
export async function getTmdbShowFullDetails(
  id: number,
  viewerId?: string | null
): Promise<{ details: ShowDetails; meta: ShowMeta } | null> {
  let result: Awaited<ReturnType<typeof fetchShowFullDetailsFromTmdb>>;
  // fetchShowFullDetailsFromTmdb throws rather than returning a partial result,
  // so nothing bad is cached — but that means one transient season failure
  // would otherwise 404 an entire show page. Retry once: a blip costs a retry,
  // a genuine absence still returns null.
  //
  // The retry passes a fixed cacheRetrySalt ('retry') rather than just
  // calling fetchShowFullDetailsFromTmdb(id) again unchanged. Verified live:
  // under Cache Components, a 'use cache' function call is memoized for the
  // lifetime of the *request* (not just the persistent hours-long cache) —
  // generateMetadata and the page body both call this with the same `id`,
  // and repeating that same call after a throw replays the same rejected
  // promise without hitting the network again, so an unsalted retry is a
  // no-op. The salt only affects the retry path (every normal call still
  // passes no salt, so its cache key/behaviour is unchanged); it flows down
  // into the season-level cache key too, so the retry's season fetches are
  // genuinely fresh rather than replaying the same failure.
  try {
    result = await fetchShowFullDetailsFromTmdb(id);
  } catch (err) {
    console.warn('[tv-shows] details fetch failed, retrying once', err);
    // Brief fixed backoff (not exponential — this is a single retry, not a
    // loop) so a 429 has a moment for TMDB's per-second window to roll over
    // instead of immediately re-hitting the same limit.
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      result = await fetchShowFullDetailsFromTmdb(id, 'retry');
    } catch (retryErr) {
      console.warn('[tv-shows] details fetch failed on retry', retryErr);
      return null;
    }
  }
  if (!result) return result;

  const row = catalogueRowFromDetails(id, result.details, result.meta);
  // Scheduled after the response instead of awaited: this is on the render
  // path for the show page (and, via getTmdbShowFullDetails's callers, the
  // home page and tracking page fan-out), and the write is an optimisation
  // that must never add a round-trip to what the viewer waits for.
  if (row) after(() => upsertCatalogueShows([row]));
  if (result.seasonRows.length > 0) {
    after(() => upsertSeasonCatalogue(result.seasonRows));
  }

  if (!viewerId) return result;

  const similarIds = result.meta.similar.map((show) => show.id);
  const overrides = await getCustomShowImages(viewerId, [id, ...similarIds]);

  const ownOverride = overrides.get(id);
  const details: ShowDetails = ownOverride
    ? {
        ...result.details,
        posterUrl: ownOverride.customPosterUrl ?? result.details.posterUrl,
        bannerUrl: ownOverride.customBannerUrl ?? result.details.bannerUrl,
      }
    : result.details;

  const similar = result.meta.similar.map((show) => {
    const override = overrides.get(show.id);
    if (!override?.customPosterUrl) return show;
    return { ...show, posterUrl: override.customPosterUrl };
  });

  return { details, meta: { ...result.meta, similar } };
}

export async function resolveShowSummaries(
  showIds: number[],
  viewerId?: string | null
): Promise<Map<number, ShowSummary>> {
  const uniqueIds = Array.from(new Set(showIds));
  // Capped at 10: this fan-out is top-level (one call per show id, no
  // nested per-show fan-out underneath it), unlike the season fan-out in
  // fetchShowFullDetailsFromTmdb which caps at 6 because it multiplies with
  // an outer per-show loop.
  const [results, overrides] = await Promise.all([
    mapWithConcurrency(uniqueIds, 10, async (id) => {
      try {
        return await fetchShowSummaryFromTmdb(id);
      } catch (err) {
        console.warn('[tv-shows] summary fetch failed', err);
        return null;
      }
    }),
    viewerId
      ? getCustomShowImages(viewerId, uniqueIds)
      : Promise.resolve(
          new Map<
            number,
            { customPosterUrl: string | null; customBannerUrl: string | null }
          >()
        ),
  ]);

  const rows = uniqueIds
    .map((id, index) => catalogueRowFromSummary(results[index]?.summary))
    .filter((row): row is CatalogueRow => row !== null);
  // Scheduled after the response instead of awaited — see the comment in
  // getTmdbShowFullDetails above.
  if (rows.length > 0) after(() => upsertCatalogueShows(rows));

  const seasonRows = results.flatMap((result) => result?.seasonRows ?? []);
  if (seasonRows.length > 0) after(() => upsertSeasonCatalogue(seasonRows));

  const map = new Map<number, ShowSummary>();
  uniqueIds.forEach((id, i) => {
    const summary = results[i]?.summary;
    if (summary) map.set(id, withCustomImages(summary, overrides.get(id)));
  });
  return map;
}

export function pickShows(
  ids: number[],
  summaries: Map<number, ShowSummary>
): ShowSummary[] {
  return ids
    .map((id) => summaries.get(id))
    .filter((show): show is ShowSummary => show !== undefined);
}

export async function getTmdbShowImages(
  showId: number,
  kind: 'poster' | 'banner'
): Promise<ShowBackdropImage[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('tmdb-show-images');

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/tv/${showId}/images?api_key=${apiKey}&include_image_language=en,null`
    );

    if (!res.ok) {
      console.warn(`[tv-shows] TMDB images ${res.status}: ${res.statusText}`);
      return [];
    }

    const json: TMDBShowImagesRaw = await res.json();
    const rawImages =
      kind === 'poster' ? (json.posters ?? []) : (json.backdrops ?? []);
    const [thumbnailBaseUrl, fullBaseUrl] =
      kind === 'poster'
        ? [TMDB_IMAGE_BASE_URL, TMDB_POSTER_LARGE_BASE_URL]
        : [TMDB_BACKDROP_BASE_URL, TMDB_BACKDROP_LARGE_BASE_URL];

    return rawImages.map((image) => ({
      filePath: image.file_path,
      thumbnailUrl: `${thumbnailBaseUrl}${image.file_path}`,
      fullUrl: `${fullBaseUrl}${image.file_path}`,
    }));
  } catch (err) {
    console.warn('[tv-shows] images fetch failed', err);
    return [];
  }
}

// TMDB/JustWatch list ad-supported or channel-billed tiers as separate
// providers (e.g. "Netflix" and "Netflix Standard with Ads"). Stripping these
// known suffixes gives a stable key to merge those variants back into one.
const PROVIDER_VARIANT_SUFFIXES = [
  'standard with ads',
  'basic with ads',
  'with ads',
  'amazon channel',
  'apple tv channel',
  'roku premium channel',
  'premium',
  'standard',
  'basic',
];

function normalizeProviderName(name: string): string {
  let result = name.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of PROVIDER_VARIANT_SUFFIXES) {
      if (
        result.length > suffix.length &&
        result.toLowerCase().endsWith(suffix)
      ) {
        result = result.slice(0, result.length - suffix.length).trim();
        changed = true;
        break;
      }
    }
  }
  return result.toLowerCase();
}

// TMDB returns flatrate (subscription) providers per country in one response
// (sourced from JustWatch); we invert that into provider -> countries so the
// UI can show "Netflix - US, UK" instead of a wall of per-country sections.
export async function getTmdbWatchProviders(
  id: number
): Promise<WatchProvider[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('tmdb-watch-providers');

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/tv/${id}/watch/providers?api_key=${apiKey}`
    );

    if (!res.ok) {
      console.warn(
        `[tv-shows] TMDB watch providers ${res.status}: ${res.statusText}`
      );
      return [];
    }

    const json: TMDBWatchProvidersRaw = await res.json();

    type ProviderAgg = {
      providerId: number;
      providerName: string;
      logoUrl: string | null;
      priority: number;
      // Lowest display_priority among our preferred countries only, so a
      // provider that's merely obscure-but-prominent in some other market
      // doesn't outrank major services in the markets we actually care
      // about.
      preferredPriority: number | null;
      countries: Set<string>;
    };

    const byProvider = new Map<number, Omit<ProviderAgg, 'providerId'>>();

    for (const [country, data] of Object.entries(json.results ?? {})) {
      const isPreferredCountry = (
        WATCH_PROVIDER_PRIORITY_COUNTRIES as readonly string[]
      ).includes(country);

      for (const provider of data.flatrate ?? []) {
        const existing = byProvider.get(provider.provider_id);
        if (existing) {
          existing.countries.add(country);
          existing.priority = Math.min(
            existing.priority,
            provider.display_priority
          );
          if (isPreferredCountry) {
            existing.preferredPriority = Math.min(
              existing.preferredPriority ?? Infinity,
              provider.display_priority
            );
          }
        } else {
          byProvider.set(provider.provider_id, {
            providerName: provider.provider_name,
            logoUrl: provider.logo_path
              ? `${TMDB_PROVIDER_LOGO_BASE_URL}${provider.logo_path}`
              : null,
            priority: provider.display_priority,
            preferredPriority: isPreferredCountry
              ? provider.display_priority
              : null,
            countries: new Set([country]),
          });
        }
      }
    }

    // Merge same-brand variants (e.g. "Netflix" + "Netflix Standard with
    // Ads") into a single entry, keeping the more prominent variant's
    // name/logo/id but pooling their country coverage and links.
    const deduped = new Map<string, ProviderAgg>();

    for (const [providerId, provider] of byProvider.entries()) {
      const key = normalizeProviderName(provider.providerName);
      const existing = deduped.get(key);

      if (!existing) {
        deduped.set(key, { ...provider, providerId });
        continue;
      }

      provider.countries.forEach((country) => existing.countries.add(country));
      if (provider.preferredPriority !== null) {
        existing.preferredPriority = Math.min(
          existing.preferredPriority ?? Infinity,
          provider.preferredPriority
        );
      }
      if (provider.priority < existing.priority) {
        existing.providerId = providerId;
        existing.providerName = provider.providerName;
        existing.logoUrl = provider.logoUrl;
      }
      existing.priority = Math.min(existing.priority, provider.priority);
    }

    return Array.from(deduped.values())
      .sort((a, b) => {
        const aRank = a.preferredPriority ?? Infinity;
        const bRank = b.preferredPriority ?? Infinity;
        if (aRank !== bRank) return aRank - bRank;
        return a.priority - b.priority;
      })
      .map((provider) => ({
        providerId: provider.providerId,
        providerName: provider.providerName,
        logoUrl: provider.logoUrl,
        countries: Array.from(provider.countries),
      }));
  } catch (err) {
    console.warn('[tv-shows] watch providers fetch failed', err);
    return [];
  }
}
