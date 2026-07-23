import { describe, expect, it } from 'vitest';

import type { EpisodeWatch, LatestEpisode, SeasonEpisode } from '@/types';

import { buildUpcomingGroups, type TrackingShow } from './buildUpcomingGroups';

// Formats using local date components, not toISOString (which converts to
// UTC and, in a positive-UTC-offset timezone, shifts local midnight back to
// the previous calendar day) — getDaysUntilAir parses the string as a local
// date via `new Date(\`${dateStr}T00:00:00\`)`, so this must match.
function daysFromNow(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeShow(overrides: Partial<TrackingShow> & { showId: number }): TrackingShow {
  return {
    showName: `Show ${overrides.showId}`,
    posterUrl: null,
    network: null,
    nextEpisode: null,
    upcomingEpisodes: null,
    seasons: null,
    watchedEpisodes: [] as EpisodeWatch[],
    skipCatchUpPrompt: false,
    initialStatus: null,
    tmdbStatus: null,
    cast: [],
    ...overrides,
  };
}

function makeLatestEpisode(
  overrides: Partial<LatestEpisode> & { seasonNumber: number; episodeNumber: number }
): LatestEpisode {
  return {
    name: `Episode ${overrides.episodeNumber}`,
    overview: '',
    airDate: null,
    runtime: null,
    imageUrl: null,
    ...overrides,
  };
}

function makeSeasonEpisode(
  overrides: Partial<SeasonEpisode> & { episodeNumber: number }
): SeasonEpisode {
  return {
    name: `Episode ${overrides.episodeNumber}`,
    overview: '',
    airDate: null,
    runtime: null,
    imageUrl: null,
    arcName: null,
    ...overrides,
  };
}

describe('buildUpcomingGroups', () => {
  it('skips a show with no nextEpisode', () => {
    const groups = buildUpcomingGroups([makeShow({ showId: 1 })]);
    expect(groups).toEqual([]);
  });

  it('falls back to nextEpisode alone when upcomingEpisodes is null', () => {
    const show = makeShow({
      showId: 1,
      nextEpisode: makeLatestEpisode({
        seasonNumber: 2,
        episodeNumber: 5,
        airDate: daysFromNow(3),
      }),
      upcomingEpisodes: null,
    });

    const groups = buildUpcomingGroups([show]);
    const allEntries = groups.flatMap((g) => g.entries);
    expect(allEntries).toHaveLength(1);
    expect(allEntries[0].episode.episodeNumber).toBe(5);
    expect(allEntries[0].seasonNumber).toBe(2);
  });

  it('contributes every future-dated episode in upcomingEpisodes, not just one', () => {
    // A weekly show mid-season: nextEpisode is E5, but three more episodes
    // of the same season already have air dates.
    const show = makeShow({
      showId: 1,
      nextEpisode: makeLatestEpisode({
        seasonNumber: 1,
        episodeNumber: 5,
        airDate: daysFromNow(2),
      }),
      upcomingEpisodes: [
        makeSeasonEpisode({ episodeNumber: 5, airDate: daysFromNow(2) }),
        makeSeasonEpisode({ episodeNumber: 6, airDate: daysFromNow(9) }),
        makeSeasonEpisode({ episodeNumber: 7, airDate: daysFromNow(16) }),
        makeSeasonEpisode({ episodeNumber: 8, airDate: daysFromNow(23) }),
      ],
    });

    const groups = buildUpcomingGroups([show]);
    const allEntries = groups.flatMap((g) => g.entries);
    expect(allEntries.map((e) => e.episode.episodeNumber)).toEqual([
      5, 6, 7, 8,
    ]);
    expect(allEntries.every((e) => e.seasonNumber === 1)).toBe(true);
    expect(allEntries.every((e) => e.showId === 1)).toBe(true);
  });

  it('drops upcomingEpisodes entries that are not future-dated (already aired or undated)', () => {
    const show = makeShow({
      showId: 1,
      nextEpisode: makeLatestEpisode({
        seasonNumber: 1,
        episodeNumber: 3,
        airDate: daysFromNow(2),
      }),
      upcomingEpisodes: [
        makeSeasonEpisode({ episodeNumber: 1, airDate: daysFromNow(-10) }),
        makeSeasonEpisode({ episodeNumber: 2, airDate: null }),
        makeSeasonEpisode({ episodeNumber: 3, airDate: daysFromNow(2) }),
      ],
    });

    const groups = buildUpcomingGroups([show]);
    const allEntries = groups.flatMap((g) => g.entries);
    expect(allEntries.map((e) => e.episode.episodeNumber)).toEqual([3]);
  });

  it('caps the total number of rows across all shows at UPCOMING_LIMIT (8)', () => {
    const show = makeShow({
      showId: 1,
      nextEpisode: makeLatestEpisode({
        seasonNumber: 1,
        episodeNumber: 1,
        airDate: daysFromNow(1),
      }),
      upcomingEpisodes: Array.from({ length: 10 }, (_, i) =>
        makeSeasonEpisode({
          episodeNumber: i + 1,
          airDate: daysFromNow(i + 1),
        })
      ),
    });

    const groups = buildUpcomingGroups([show]);
    const allEntries = groups.flatMap((g) => g.entries);
    expect(allEntries).toHaveLength(8);
    expect(allEntries[0].episode.episodeNumber).toBe(1);
    expect(allEntries[7].episode.episodeNumber).toBe(8);
  });

  it('interleaves multiple shows sorted by air date, each contributing more than one row', () => {
    const showA = makeShow({
      showId: 1,
      showName: 'A',
      nextEpisode: makeLatestEpisode({
        seasonNumber: 1,
        episodeNumber: 1,
        airDate: daysFromNow(1),
      }),
      upcomingEpisodes: [
        makeSeasonEpisode({ episodeNumber: 1, airDate: daysFromNow(1) }),
        makeSeasonEpisode({ episodeNumber: 2, airDate: daysFromNow(8) }),
      ],
    });
    const showB = makeShow({
      showId: 2,
      showName: 'B',
      nextEpisode: makeLatestEpisode({
        seasonNumber: 3,
        episodeNumber: 6,
        airDate: daysFromNow(3),
      }),
      upcomingEpisodes: [
        makeSeasonEpisode({ episodeNumber: 6, airDate: daysFromNow(3) }),
        makeSeasonEpisode({ episodeNumber: 7, airDate: daysFromNow(10) }),
      ],
    });

    const groups = buildUpcomingGroups([showA, showB]);
    const allEntries = groups.flatMap((g) => g.entries);
    expect(
      allEntries.map((e) => `${e.showId}-${e.episode.episodeNumber}`)
    ).toEqual(['1-1', '2-6', '1-2', '2-7']);
  });
});
