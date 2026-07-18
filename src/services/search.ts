import 'server-only';

import { TMDB_API_BASE_URL, TMDB_IMAGE_BASE_URL } from '@/consts';

import type {
  PersonSearchResult,
  TMDBSearchPersonRaw,
  TMDBSearchTvRaw,
  TvShowSearchResult,
} from '@/types';

import { isAnime } from '@/utils';

const CAST_PREVIEW_LIMIT = 5;
// Results per batch (initial load and each "Load more"), independent of
// TMDB's own page size (20) — kept small and consistent regardless of how
// many raw TMDB results a given batch had to search through to fill it.
const PAGE_SIZE = 10;

export type SearchType = 'all' | 'shows' | 'anime' | 'cast';

// Resume point for the next batch: which raw TMDB page to fetch, and how
// many of that page's (filtered) results were already delivered in a
// previous batch. Needed because a batch can end partway through a TMDB
// page once PAGE_SIZE is reached.
export type SearchCursor = { tmdbPage: number; skip: number };

// Not exported — callers outside this file build their own
// `{ tmdbPage: 1, skip: 0 }` literal for the first batch.
const INITIAL_SEARCH_CURSOR: SearchCursor = { tmdbPage: 1, skip: 0 };

export type SearchPageResult = {
  shows: TvShowSearchResult[];
  people: PersonSearchResult[];
  hasMore: boolean;
  nextCursor: SearchCursor;
};

async function fetchTmdbTvSearch(
  query: string,
  page: number
): Promise<{ results: TvShowSearchResult[]; hasMore: boolean }> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[search] TMDB_API_KEY not set');
    return { results: [], hasMore: false };
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/search/tv?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=${page}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      console.warn(`[search] TMDB tv search ${res.status}: ${res.statusText}`);
      return { results: [], hasMore: false };
    }

    const json: { results?: TMDBSearchTvRaw[]; total_pages?: number } =
      await res.json();
    const raw = Array.isArray(json.results) ? json.results : [];

    const results: TvShowSearchResult[] = raw.map((show) => ({
      id: show.id,
      name: show.name,
      originalName:
        show.original_language !== 'en' && show.original_name !== show.name
          ? show.original_name
          : null,
      overview: show.overview,
      posterUrl: show.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${show.poster_path}`
        : null,
      firstAirDate: show.first_air_date || null,
      voteAverage: show.vote_average,
      isAnime: isAnime(show.genre_ids ?? [], show.origin_country ?? []),
    }));

    return { results, hasMore: page < (json.total_pages ?? 0) };
  } catch (err) {
    console.warn('[search] tv search failed', err);
    return { results: [], hasMore: false };
  }
}

async function fetchTmdbPersonSearch(
  query: string,
  page: number
): Promise<{ results: PersonSearchResult[]; hasMore: boolean }> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[search] TMDB_API_KEY not set');
    return { results: [], hasMore: false };
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/search/person?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=${page}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      console.warn(
        `[search] TMDB person search ${res.status}: ${res.statusText}`
      );
      return { results: [], hasMore: false };
    }

    const json: { results?: TMDBSearchPersonRaw[]; total_pages?: number } =
      await res.json();
    const raw = Array.isArray(json.results) ? json.results : [];

    const results: PersonSearchResult[] = raw.map((person) => ({
      id: person.id,
      name: person.name,
      profileUrl: person.profile_path
        ? `${TMDB_IMAGE_BASE_URL}${person.profile_path}`
        : null,
      knownForNames: (person.known_for ?? [])
        .map((credit) => credit.name ?? credit.title ?? null)
        .filter((name): name is string => name !== null)
        .slice(0, 3),
    }));

    return { results, hasMore: page < (json.total_pages ?? 0) };
  } catch (err) {
    console.warn('[search] person search failed', err);
    return { results: [], hasMore: false };
  }
}

// Accumulates filtered TV results across as many raw TMDB pages as needed
// to fill PAGE_SIZE (or exhaust TMDB's results), so a batch's size doesn't
// depend on how many of one raw TMDB page's 20 results happen to pass
// `filterFn` (e.g. an "anime" batch isn't capped at whatever anime shows
// happened to land on a single TMDB page). Never re-delivers or skips a
// result: `cursor.skip` resumes exactly where the previous batch stopped
// within a partially-consumed TMDB page.
async function collectTvShows(
  query: string,
  filterFn: (show: TvShowSearchResult) => boolean,
  cursor: SearchCursor
): Promise<{
  results: TvShowSearchResult[];
  hasMore: boolean;
  nextCursor: SearchCursor;
}> {
  let tmdbPage = cursor.tmdbPage;
  let skip = cursor.skip;
  const collected: TvShowSearchResult[] = [];

  for (;;) {
    const { results, hasMore: pageHasMore } = await fetchTmdbTvSearch(
      query,
      tmdbPage
    );
    const filtered = results.filter(filterFn).slice(skip);
    const needed = PAGE_SIZE - collected.length;

    if (filtered.length > needed) {
      collected.push(...filtered.slice(0, needed));
      return {
        results: collected,
        hasMore: true,
        nextCursor: { tmdbPage, skip: skip + needed },
      };
    }

    collected.push(...filtered);
    skip = 0;

    if (!pageHasMore) {
      return {
        results: collected,
        hasMore: false,
        nextCursor: { tmdbPage, skip: 0 },
      };
    }
    if (collected.length >= PAGE_SIZE) {
      return {
        results: collected,
        hasMore: true,
        nextCursor: { tmdbPage: tmdbPage + 1, skip: 0 },
      };
    }
    tmdbPage += 1;
  }
}

// Same accumulation strategy as collectTvShows, for unfiltered person
// results (still capped to PAGE_SIZE per batch for a consistent list size).
async function collectPeople(
  query: string,
  cursor: SearchCursor
): Promise<{
  results: PersonSearchResult[];
  hasMore: boolean;
  nextCursor: SearchCursor;
}> {
  let tmdbPage = cursor.tmdbPage;
  let skip = cursor.skip;
  const collected: PersonSearchResult[] = [];

  for (;;) {
    const { results, hasMore: pageHasMore } = await fetchTmdbPersonSearch(
      query,
      tmdbPage
    );
    const remaining = results.slice(skip);
    const needed = PAGE_SIZE - collected.length;

    if (remaining.length > needed) {
      collected.push(...remaining.slice(0, needed));
      return {
        results: collected,
        hasMore: true,
        nextCursor: { tmdbPage, skip: skip + needed },
      };
    }

    collected.push(...remaining);
    skip = 0;

    if (!pageHasMore) {
      return {
        results: collected,
        hasMore: false,
        nextCursor: { tmdbPage, skip: 0 },
      };
    }
    if (collected.length >= PAGE_SIZE) {
      return {
        results: collected,
        hasMore: true,
        nextCursor: { tmdbPage: tmdbPage + 1, skip: 0 },
      };
    }
    tmdbPage += 1;
  }
}

function isInitialCursor(cursor: SearchCursor): boolean {
  return (
    cursor.tmdbPage === INITIAL_SEARCH_CURSOR.tmdbPage &&
    cursor.skip === INITIAL_SEARCH_CURSOR.skip
  );
}

// Single entry point for both the initial server-rendered page (the
// initial cursor) and the client "Load more" button (each call's
// returned `nextCursor`), so the anime split and cast capping only need
// to be implemented once.
export async function loadMoreSearchResults(
  query: string,
  type: SearchType,
  cursor: SearchCursor
): Promise<SearchPageResult> {
  if (!query.trim()) {
    return { shows: [], people: [], hasMore: false, nextCursor: cursor };
  }

  if (type === 'cast') {
    const { results, hasMore, nextCursor } = await collectPeople(query, cursor);
    return { shows: [], people: results, hasMore, nextCursor };
  }

  if (type === 'shows' || type === 'anime') {
    const { results, hasMore, nextCursor } = await collectTvShows(
      query,
      (show) => (type === 'anime' ? show.isAnime : !show.isAnime),
      cursor
    );
    return { shows: results, people: [], hasMore, nextCursor };
  }

  // type === 'all': shows are paginated normally; cast is a fixed,
  // capped preview that only exists on the very first batch.
  const { results, hasMore, nextCursor } = await collectTvShows(
    query,
    () => true,
    cursor
  );
  const people = isInitialCursor(cursor)
    ? (await fetchTmdbPersonSearch(query, 1)).results.slice(
        0,
        CAST_PREVIEW_LIMIT
      )
    : [];

  return { shows: results, people, hasMore, nextCursor };
}
