'use server';

import { unstable_cache } from 'next/cache';

import {
  TMDB_API_BASE_URL,
  TMDB_BACKDROP_BASE_URL,
  TMDB_BACKDROP_LARGE_BASE_URL,
  TMDB_IMAGE_BASE_URL,
} from '@/consts';

import type {
  SeasonEpisode,
  ShowDetails,
  ShowMeta,
  TMDBSeasonDetailRaw,
  TMDBSeriesDetailsRaw,
  TMDBTvShowRaw,
  TvShow,
} from '@/types';

import { getCountryDisplayName, getLanguageDisplayName } from '@/utils';

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

async function fetchTmdbSeasonEpisodes(
  showId: number,
  seasonNumber: number
): Promise<SeasonEpisode[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${apiKey}&language=en-US`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      console.warn(`[tv-shows] TMDB season ${res.status}: ${res.statusText}`);
      return [];
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
    }));
  } catch (err) {
    console.warn('[tv-shows] season fetch failed', err);
    return [];
  }
}

export const getTmdbSeasonEpisodes = unstable_cache(
  fetchTmdbSeasonEpisodes,
  ['tmdb-season-episodes'],
  { revalidate: 3600, tags: ['tmdb-season-episodes'] }
);

// Fetched unconditionally for every show detail page: `details` covers
// name/overview/images/genres/cast/network/status/etc, while `meta`
// (season summaries with their episodes, latest episode, recommendations)
// comes from here too, since TMDB returns it all in a ready-to-render
// shape.
async function fetchTmdbShowFullDetails(
  id: number
): Promise<{ details: ShowDetails; meta: ShowMeta } | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return null;
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/tv/${id}?api_key=${apiKey}&language=en-US&append_to_response=credits,content_ratings,recommendations`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      console.warn(`[tv-shows] TMDB details ${res.status}: ${res.statusText}`);
      return null;
    }

    const json: TMDBSeriesDetailsRaw = await res.json();

    const details: ShowDetails = {
      name: json.name,
      overview: json.overview,
      year: json.first_air_date ? json.first_air_date.slice(0, 4) : null,
      bannerUrl: json.backdrop_path
        ? `${TMDB_BACKDROP_LARGE_BASE_URL}${json.backdrop_path}`
        : null,
      posterUrl: json.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${json.poster_path}`
        : null,
      genres: (json.genres ?? []).map((genre) => genre.name),
      network: json.networks?.[0]?.name ?? null,
      cast: (json.credits?.cast ?? []).map((member) => ({
        actorName: member.name,
        character: member.character,
        imageUrl: member.profile_path
          ? `${TMDB_IMAGE_BASE_URL}${member.profile_path}`
          : null,
      })),
      status: json.status ?? null,
      averageRuntime: json.episode_run_time?.[0] ?? null,
      originalLanguage: getLanguageDisplayName(json.original_language),
      originalCountry: getCountryDisplayName(json.origin_country?.[0]),
      contentRating:
        json.content_ratings?.results?.find((r) => r.iso_3166_1 === 'US')
          ?.rating ?? null,
      premiereDate: json.first_air_date ?? null,
      lastAiredDate: json.last_air_date ?? null,
      nextEpisodeDate: json.next_episode_to_air?.air_date ?? null,
    };

    const lastEpisode = json.last_episode_to_air;
    const nextEpisode = json.next_episode_to_air;

    const sortedSeasons = (json.seasons ?? [])
      .slice()
      // Regular seasons in order, "Specials" (season_number 0) last.
      .sort((a, b) => {
        const rank = (n: number) => (n === 0 ? Infinity : n);
        return rank(a.season_number) - rank(b.season_number);
      });

    const seasons = await Promise.all(
      sortedSeasons.map(async (season) => ({
        name: season.name,
        seasonNumber: season.season_number,
        airDate: season.air_date,
        episodeCount: season.episode_count,
        posterUrl: season.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${season.poster_path}`
          : null,
        episodes: await getTmdbSeasonEpisodes(id, season.season_number),
      }))
    );

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
          ? `${TMDB_IMAGE_BASE_URL}${s.poster_path}`
          : null,
        matchPercentage:
          typeof s.vote_average === 'number'
            ? Math.round(s.vote_average * 10)
            : null,
      })),
    };

    return { details, meta };
  } catch (err) {
    console.warn('[tv-shows] details fetch failed', err);
    return null;
  }
}

export const getTmdbShowFullDetails = unstable_cache(
  fetchTmdbShowFullDetails,
  ['tmdb-show-full-details'],
  { revalidate: 3600, tags: ['tmdb-show-full-details'] }
);
