import 'server-only';

import { TMDB_API_BASE_URL } from '@/consts';

import { ServiceError } from './errors';

export type ResolvedShow = {
  tmdbShowId: number;
  tmdbName: string;
  matchedByName: boolean;
};

export type SeasonStructure = {
  episodeCounts: Map<number, number>;
  totalEpisodes: number;
};

type TmdbFindResponse = {
  tv_results?: { id: number; name: string }[];
  tv_episode_results?: {
    show_id: number;
    season_number: number;
    episode_number: number;
  }[];
};

type TmdbSearchResponse = {
  results?: { id: number; name: string }[];
};

type TmdbShowResponse = {
  name?: string;
  seasons?: { season_number: number; episode_count: number }[];
};

const MAX_ATTEMPTS = 3;

function apiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new ServiceError('TMDB_API_KEY not set', 'tmdb_no_key');
  return key;
}

// Returning null means "TMDB definitively has no such record" — callers turn
// that into an unmatched show or an unresolved episode. A request that was
// rate-limited or never completed must therefore NOT return null: over a run
// of ~460 show lookups plus ~1,100 episode repairs, doing so would silently
// record resolvable shows as unmatched and hand back a zero-episode season
// structure that reads as real data. Those cases throw instead, and the
// route handler's per-show catch turns them into a visible error outcome the
// user can retry.
async function tmdbFetch<T>(path: string): Promise<T | null> {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${TMDB_API_BASE_URL}${path}${separator}api_key=${apiKey()}`;
  let lastError = 'unknown error';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;

    try {
      res = await fetch(url, { cache: 'no-store' });
    } catch (err) {
      // Network-level failure (DNS, timeout, reset): transient, so retry.
      lastError = err instanceof Error ? err.message : 'network error';
      if (attempt === MAX_ATTEMPTS) break;
      await new Promise((r) => setTimeout(r, attempt * 1000));
      continue;
    }

    if (res.status === 429) {
      lastError = 'rate limited (429)';
      if (attempt === MAX_ATTEMPTS) break;
      const retryAfter = Number(res.headers.get('retry-after')) || attempt;
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    if (res.status >= 500) {
      lastError = `TMDB ${res.status}`;
      if (attempt === MAX_ATTEMPTS) break;
      await new Promise((r) => setTimeout(r, attempt * 1000));
      continue;
    }

    // 404 and other 4xx are definitive: TMDB has no such record.
    if (!res.ok) return null;

    return (await res.json()) as T;
  }

  throw new ServiceError(
    `TMDB request failed after ${MAX_ATTEMPTS} attempts (${lastError}): ${path}`,
    'tmdb_unavailable'
  );
}

function normaliseTitle(name: string): string {
  return name.trim().toLowerCase().split(/\s+/).join(' ');
}

export async function resolveShow(
  tvdbShowId: string,
  seriesName: string
): Promise<ResolvedShow | null> {
  const found = await tmdbFetch<TmdbFindResponse>(
    `/find/${encodeURIComponent(tvdbShowId)}?external_source=tvdb_id`
  );
  const byId = found?.tv_results?.[0];
  if (byId) {
    return { tmdbShowId: byId.id, tmdbName: byId.name, matchedByName: false };
  }

  const query = seriesName.trim();
  if (!query) return null;

  const searched = await tmdbFetch<TmdbSearchResponse>(
    `/search/tv?query=${encodeURIComponent(query)}`
  );

  // Strict: accept only when exactly one result's title matches. Loose
  // matching files watches under the wrong show.
  const exact = (searched?.results ?? []).filter(
    (result) => normaliseTitle(result.name) === normaliseTitle(query)
  );
  if (exact.length !== 1) return null;

  return {
    tmdbShowId: exact[0].id,
    tmdbName: exact[0].name,
    matchedByName: true,
  };
}

export async function getSeasonStructure(
  tmdbShowId: number
): Promise<SeasonStructure> {
  const show = await tmdbFetch<TmdbShowResponse>(`/tv/${tmdbShowId}`);
  const episodeCounts = new Map<number, number>();
  let totalEpisodes = 0;

  for (const season of show?.seasons ?? []) {
    episodeCounts.set(season.season_number, season.episode_count);
    // Season 0 is specials and counts toward neither side of the
    // "finished the show" comparison.
    if (season.season_number >= 1) totalEpisodes += season.episode_count;
  }

  return { episodeCounts, totalEpisodes };
}

export async function resolveEpisodeNumber(
  tvdbEpisodeId: string,
  tmdbShowId: number
): Promise<{ seasonNumber: number; episodeNumber: number } | null> {
  if (!tvdbEpisodeId) return null;

  const found = await tmdbFetch<TmdbFindResponse>(
    `/find/${encodeURIComponent(tvdbEpisodeId)}?external_source=tvdb_id`
  );
  const episode = found?.tv_episode_results?.[0];

  // Guard against a TVDB episode id that maps to a different series.
  if (!episode || episode.show_id !== tmdbShowId) return null;

  return {
    seasonNumber: episode.season_number,
    episodeNumber: episode.episode_number,
  };
}
