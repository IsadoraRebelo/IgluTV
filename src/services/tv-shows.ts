'use server';

import { unstable_cache } from 'next/cache';

import { TMDB_API_BASE_URL, TMDB_IMAGE_BASE_URL } from '@/consts';
import type { TMDBTvShowRaw, TvShow } from '@/types';

async function fetchPopularTvShows(): Promise<TvShow[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/tv/popular?api_key=${apiKey}&language=en-US&page=1`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      console.warn(`[tv-shows] TMDB ${res.status}: ${res.statusText}`);
      return [];
    }

    const json: { results?: TMDBTvShowRaw[] } = await res.json();
    const results = Array.isArray(json.results) ? json.results : [];

    return results.slice(0, 10).map((show) => ({
      id: show.id,
      name: show.name,
      overview: show.overview,
      posterUrl: show.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${show.poster_path}`
        : null,
      firstAirDate: show.first_air_date,
      voteAverage: show.vote_average,
    }));
  } catch (err) {
    console.warn('[tv-shows] fetch failed', err);
    return [];
  }
}

export const getPopularTvShows = unstable_cache(
  fetchPopularTvShows,
  ['popular-tv-shows'],
  { revalidate: 3600, tags: ['popular-tv-shows'] }
);
