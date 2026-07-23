import 'server-only';

import { TMDB_TV_GENRE_IDS_BY_NAME } from '@/consts';
import { mapWithConcurrency } from '@/utils';

import { getShowsForUser } from './tracking';
import { getDiscoverTvIdsByGenre, getTmdbShowMeta } from './tv-shows';

const MIN_AGGREGATED_RESULTS = 6;
const MAX_RESULTS = 20;

// Bounds the TMDB fan-out below, not just its per-show cost. Aggregating
// over every watching/completed show to pick ~12 recommendations is
// wasteful past a handful of seeds regardless of how cheap each seed's
// fetch is — 409 of 463 imported shows land as watching/completed, so
// without a cap this is still 409 requests even at one request per seed.
const MAX_SEED_SHOWS = 20;

type AggregatedCandidate = {
  count: number;
  bestMatch: number;
};

// Exported for testing: picks the most recently tracked `limit` rows.
// `createdAt` is the only per-show recency signal show_tracking carries —
// it's set once on insert and untouched by later status changes — so this
// approximates "shows the user has been engaged with lately" without an
// extra query against episode_watches just to rank seeds.
export function selectRecentSeeds<T extends { createdAt: string }>(
  tracked: T[],
  limit: number
): T[] {
  return [...tracked]
    .sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
    )
    .slice(0, limit);
}

export async function getRecommendedShowIdsForUser(
  userId: string
): Promise<number[]> {
  const [watching, completed, allTracked] = await Promise.all([
    getShowsForUser(userId, 'watching'),
    getShowsForUser(userId, 'completed'),
    getShowsForUser(userId),
  ]);

  const seeds = selectRecentSeeds([...watching, ...completed], MAX_SEED_SHOWS);
  if (seeds.length === 0) return [];

  const excludedIds = new Set(allTracked.map((tracked) => tracked.tmdbShowId));

  // getTmdbShowMeta (light tier: one /tv/{id} request, no season
  // expansion) rather than getTmdbShowFullDetails — this fan-out only ever
  // reads a seed's genres and its similar-shows list, neither of which
  // needs the season tree the full-details tier fetches per show. That
  // tier previously turned a signed-in home render into ~409 main-fetch
  // calls plus up to ~6 season calls each; this is capped at
  // MAX_SEED_SHOWS main-fetch calls and nothing else.
  const rawSeedDetails = await mapWithConcurrency(seeds, 10, (tracked) =>
    getTmdbShowMeta(tracked.tmdbShowId)
  );
  const seedDetails = rawSeedDetails.filter(
    (meta): meta is NonNullable<(typeof rawSeedDetails)[number]> =>
      meta !== null
  );

  // .similar is TMDB's recommendations list already capped to 12 by
  // getTmdbShowMeta, so this tallies each seed's top 12, not its full
  // recommendation set — a deliberate reuse of that cached fetch rather
  // than an extra round trip.
  const candidates = new Map<number, AggregatedCandidate>();
  for (const seed of seedDetails) {
    for (const similar of seed.similar) {
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
    for (const genre of seed.genres) {
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
