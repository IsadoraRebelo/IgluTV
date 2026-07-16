'use server';

import { unstable_cache } from 'next/cache';

import { getDaysUntilAir } from '@/components/ShowTracker/utils';

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
  TMDBEpisodeGroupDetail,
  TMDBEpisodeGroupListEntry,
  TMDBSeasonDetailRaw,
  TMDBSeriesDetailsRaw,
  TMDBShowImagesRaw,
  TMDBTvShowRaw,
  TMDBWatchProvidersRaw,
  TvShow,
  WatchProvider,
} from '@/types';

import {
  getCountryDisplayName,
  getLanguageDisplayName,
  isAnime,
} from '@/utils';

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
      arcName: null,
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

async function fetchTmdbAnimeArcNames(
  showId: number
): Promise<Map<string, string> | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return null;
  }

  try {
    const listRes = await fetch(
      `${TMDB_API_BASE_URL}/tv/${showId}/episode_groups?api_key=${apiKey}`,
      { cache: 'no-store' }
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
      `${TMDB_API_BASE_URL}/tv/episode_group/${chosen.id}?api_key=${apiKey}`,
      { cache: 'no-store' }
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

export const getTmdbAnimeArcNames = unstable_cache(
  fetchTmdbAnimeArcNames,
  ['tmdb-anime-arc-names'],
  { revalidate: 3600, tags: ['tmdb-anime-arc-names'] }
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

    // Arc-name dividers (SeasonAccordion) are opt-in per show: only fetched
    // for anime, and only actually used if TMDB has a community-maintained
    // "aired order" episode group for it (getTmdbAnimeArcNames returns null
    // otherwise, e.g. for Breaking Bad, which has no such group at all).
    const showIsAnime = isAnime(
      (json.genres ?? []).map((genre) => genre.id),
      json.origin_country ?? []
    );
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

    const seasons = await Promise.all(
      sortedSeasons.map(async (season) => ({
        name: season.name,
        seasonNumber: season.season_number,
        airDate: season.air_date,
        episodeCount: season.episode_count,
        posterUrl: season.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${season.poster_path}`
          : null,
        episodes: (await getTmdbSeasonEpisodes(id, season.season_number)).map(
          (episode) => ({
            ...episode,
            arcName:
              arcNames?.get(
                `${season.season_number}-${episode.episodeNumber}`
              ) ?? null,
          })
        ),
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

export async function resolveShowSummaries(
  showIds: number[]
): Promise<Map<number, ShowSummary>> {
  const uniqueIds = Array.from(new Set(showIds));
  const results = await Promise.all(
    uniqueIds.map((id) => getTmdbShowFullDetails(id))
  );

  const map = new Map<number, ShowSummary>();
  uniqueIds.forEach((id, i) => {
    const full = results[i];
    if (!full) return;

    const markableEpisodeCount = full.meta.seasons
      .filter((season) => season.seasonNumber > 0)
      .reduce(
        (sum, season) =>
          sum +
          season.episodes.filter((ep) => getDaysUntilAir(ep.airDate) === null)
            .length,
        0
      );

    map.set(id, {
      id,
      name: full.details.name,
      posterUrl:
        full.details.posterUrl?.replace(
          TMDB_IMAGE_BASE_URL,
          TMDB_POSTER_LARGE_BASE_URL
        ) ?? null,
      bannerUrl: full.details.bannerUrl,
      markableEpisodeCount,
      year: full.details.year,
      genres: full.details.genres,
      network: full.details.network,
    });
  });
  return map;
}

async function fetchTmdbShowImages(
  showId: number
): Promise<ShowBackdropImage[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/tv/${showId}/images?api_key=${apiKey}&include_image_language=en,null`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      console.warn(`[tv-shows] TMDB images ${res.status}: ${res.statusText}`);
      return [];
    }

    const json: TMDBShowImagesRaw = await res.json();

    return (json.backdrops ?? []).map((image) => ({
      filePath: image.file_path,
      thumbnailUrl: `${TMDB_BACKDROP_BASE_URL}${image.file_path}`,
      fullUrl: `${TMDB_BACKDROP_LARGE_BASE_URL}${image.file_path}`,
    }));
  } catch (err) {
    console.warn('[tv-shows] images fetch failed', err);
    return [];
  }
}

export const getTmdbShowImages = unstable_cache(
  fetchTmdbShowImages,
  ['tmdb-show-images'],
  { revalidate: 3600, tags: ['tmdb-show-images'] }
);

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
async function fetchTmdbWatchProviders(id: number): Promise<WatchProvider[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[tv-shows] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/tv/${id}/watch/providers?api_key=${apiKey}`,
      { cache: 'no-store' }
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

export const getTmdbWatchProviders = unstable_cache(
  fetchTmdbWatchProviders,
  ['tmdb-watch-providers'],
  { revalidate: 3600, tags: ['tmdb-watch-providers'] }
);
