import { cacheLife, cacheTag } from 'next/cache';
import 'server-only';

import { TMDB_API_BASE_URL, TMDB_IMAGE_BASE_URL } from '@/consts';

import type {
  PersonCastCredit,
  PersonDetails,
  TMDBPersonRaw,
  TMDBPersonTvCreditsRaw,
} from '@/types';

// Deliberately not wrapped in try/catch: this function is 'use cache', so
// returning a fallback value here (as an earlier revision did) caches that
// fallback for hours — and /cast/[id]/page.tsx turns a null result into
// notFound(), so a single transient TMDB failure 404'd the cast page for
// hours with no way to recover short of a redeploy. Throwing instead means
// nothing gets cached; the uncached wrapper below (getTmdbPersonDetails) is
// responsible for degrading to null, same pattern as fetchTmdbShowMeta in
// tv-shows.ts.
async function fetchTmdbPersonDetails(id: number): Promise<PersonDetails | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('tmdb-person-details');

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[person] TMDB_API_KEY not set');
    return null;
  }

  const res = await fetch(
    `${TMDB_API_BASE_URL}/person/${id}?api_key=${apiKey}&language=en-US`
  );

  if (!res.ok) {
    throw new Error(`[person] TMDB details ${res.status}: ${res.statusText}`);
  }

  const json: TMDBPersonRaw = await res.json();

  return {
    name: json.name,
    biography: json.biography ?? '',
    profileUrl: json.profile_path
      ? `${TMDB_IMAGE_BASE_URL}${json.profile_path}`
      : null,
  };
}

export async function getTmdbPersonDetails(
  id: number
): Promise<PersonDetails | null> {
  try {
    return await fetchTmdbPersonDetails(id);
  } catch (err) {
    console.warn('[person] details fetch failed', err);
    return null;
  }
}

// TMDB returns one credit per role, not per show — a person with two
// separate roles in the same show (a recast, a voice-only episode, a
// dual role) gets two entries sharing the same show id. Merge those into
// one card per show, summing episode counts as the best available
// estimate of total episodes appeared in (TMDB's summary endpoint
// doesn't expose per-episode overlap data to dedupe more precisely).
function dedupeByShow(credits: PersonCastCredit[]): PersonCastCredit[] {
  const byShowId = new Map<number, PersonCastCredit>();

  for (const credit of credits) {
    const existing = byShowId.get(credit.showId);
    if (!existing) {
      byShowId.set(credit.showId, { ...credit });
      continue;
    }
    existing.episodeCount += credit.episodeCount;
    if (!existing.posterUrl && credit.posterUrl) {
      existing.posterUrl = credit.posterUrl;
    }
    if (credit.popularity > existing.popularity) {
      existing.popularity = credit.popularity;
    }
  }

  return Array.from(byShowId.values());
}

export async function getTmdbPersonTvCredits(
  id: number
): Promise<PersonCastCredit[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('tmdb-person-tv-credits');

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[person] TMDB_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/person/${id}/tv_credits?api_key=${apiKey}&language=en-US`
    );

    if (!res.ok) {
      console.warn(`[person] TMDB tv credits ${res.status}: ${res.statusText}`);
      return [];
    }

    const json: TMDBPersonTvCreditsRaw = await res.json();
    const raw = Array.isArray(json.cast) ? json.cast : [];

    return dedupeByShow(
      raw.map((credit) => ({
        showId: credit.id,
        showName: credit.name,
        posterUrl: credit.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${credit.poster_path}`
          : null,
        firstAirDate: credit.first_air_date || null,
        year: credit.first_air_date ? credit.first_air_date.slice(0, 4) : null,
        genreIds: credit.genre_ids ?? [],
        popularity: credit.popularity,
        episodeCount: credit.episode_count,
        character: credit.character,
      }))
    );
  } catch (err) {
    console.warn('[person] tv credits fetch failed', err);
    return [];
  }
}
