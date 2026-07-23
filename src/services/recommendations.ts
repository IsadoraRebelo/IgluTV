import 'server-only';

import { TMDB_TV_GENRE_IDS_BY_NAME } from '@/consts';
import { mapWithConcurrency } from '@/utils';

import { getShowsForUser } from './tracking';
import { getDiscoverTvIdsByGenre, getTmdbShowFullDetails } from './tv-shows';

const MIN_AGGREGATED_RESULTS = 6;
const MAX_RESULTS = 20;

type AggregatedCandidate = {
  count: number;
  bestMatch: number;
};

export async function getRecommendedShowIdsForUser(
  userId: string
): Promise<number[]> {
  const [watching, completed, allTracked] = await Promise.all([
    getShowsForUser(userId, 'watching'),
    getShowsForUser(userId, 'completed'),
    getShowsForUser(userId),
  ]);

  const seeds = [...watching, ...completed];
  if (seeds.length === 0) return [];

  const excludedIds = new Set(allTracked.map((tracked) => tracked.tmdbShowId));

  const rawSeedDetails = await mapWithConcurrency(seeds, 10, (tracked) =>
    getTmdbShowFullDetails(tracked.tmdbShowId)
  );
  const seedDetails = rawSeedDetails.filter(
    (full): full is NonNullable<(typeof rawSeedDetails)[number]> =>
      full !== null
  );

  // meta.similar is TMDB's recommendations list already capped to 12 by
  // getTmdbShowFullDetails, so this tallies each seed's top 12, not its
  // full recommendation set — a deliberate reuse of that cached fetch
  // rather than an extra round trip.
  const candidates = new Map<number, AggregatedCandidate>();
  for (const seed of seedDetails) {
    for (const similar of seed.meta.similar) {
      if (excludedIds.has(similar.id)) continue;
      const matchPercentage = similar.matchPercentage ?? 0;
      const existing = candidates.get(similar.id);
      if (existing) {
        existing.count += 1;
        existing.bestMatch = Math.max(existing.bestMatch, matchPercentage);
      } else {
        candidates.set(similar.id, { count: 1, bestMatch: matchPercentage });
      }
    }
  }

  const aggregatedIds = Array.from(candidates.entries())
    .sort(([, a], [, b]) => b.count - a.count || b.bestMatch - a.bestMatch)
    .map(([id]) => id);

  if (aggregatedIds.length >= MIN_AGGREGATED_RESULTS) {
    return aggregatedIds.slice(0, MAX_RESULTS);
  }

  const genreCounts = new Map<string, number>();
  for (const seed of seedDetails) {
    for (const genre of seed.details.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  const topGenre = Array.from(genreCounts.entries()).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0];

  const genreId =
    topGenre !== undefined ? TMDB_TV_GENRE_IDS_BY_NAME[topGenre] : undefined;
  if (genreId === undefined) {
    return aggregatedIds.slice(0, MAX_RESULTS);
  }

  const genreIds = (await getDiscoverTvIdsByGenre(genreId)).filter(
    (id) => !excludedIds.has(id)
  );

  return genreIds.slice(0, MAX_RESULTS);
}
