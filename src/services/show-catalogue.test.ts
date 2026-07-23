import { describe, expect, it } from 'vitest';

import type { ShowDetails, ShowMeta } from '@/types';

import {
  catalogueRowFromDetails,
  catalogueRowFromSummary,
  catalogueRowFromTmdb,
  catalogueShowFromRow,
  catalogueShowFromSummary,
  selectMissingIds,
  selectShowsNeedingRefetch,
} from './show-catalogue';
import { deriveMarkableEpisodeCount } from './tv-shows';

const FULL = {
  name: 'Bleach',
  first_air_date: '2004-10-05',
  poster_path: '/abc123.jpg',
  genres: [
    { id: 16, name: 'Animation' },
    { id: 10759, name: 'Action & Adventure' },
  ],
  seasons: [
    { season_number: 0, episode_count: 4 },
    { season_number: 1, episode_count: 366 },
    { season_number: 2, episode_count: 53 },
  ],
  last_episode_to_air: { season_number: 2, episode_number: 13, runtime: 24 },
};

describe('catalogueRowFromTmdb', () => {
  it('maps a complete response', () => {
    expect(catalogueRowFromTmdb(30984, FULL)).toEqual({
      tmdb_show_id: 30984,
      name: 'Bleach',
      year: '2004',
      genres: ['Animation', 'Action & Adventure'],
      poster_path: '/abc123.jpg',
      markable_episode_count: 379,
      average_runtime: 24,
    });
  });

  it('stores the raw poster path, not a URL', () => {
    const row = catalogueRowFromTmdb(30984, FULL);
    expect(row?.poster_path).toBe('/abc123.jpg');
    expect(row?.poster_path).not.toContain('http');
  });

  it('returns null when the response has no name', () => {
    expect(catalogueRowFromTmdb(1, { ...FULL, name: undefined })).toBe(null);
  });

  it('returns null when the response has an empty name', () => {
    expect(catalogueRowFromTmdb(1, { ...FULL, name: '   ' })).toBe(null);
  });

  it('returns null for a null response', () => {
    expect(catalogueRowFromTmdb(1, null)).toBe(null);
  });

  it('tolerates missing optional fields', () => {
    expect(catalogueRowFromTmdb(7, { name: 'Minimal' })).toEqual({
      tmdb_show_id: 7,
      name: 'Minimal',
      year: null,
      genres: [],
      poster_path: null,
      markable_episode_count: 0,
      average_runtime: null,
    });
  });

  it('takes the year from the first air date', () => {
    const row = catalogueRowFromTmdb(1, {
      name: 'X',
      first_air_date: '1994-09-22',
    });
    expect(row?.year).toBe('1994');
  });

  it('treats an empty first air date as no year', () => {
    const row = catalogueRowFromTmdb(1, { name: 'X', first_air_date: '' });
    expect(row?.year).toBe(null);
  });
});

describe('catalogueRowFromSummary', () => {
  const summary = {
    id: 30984,
    name: 'Bleach',
    posterUrl: 'https://image.tmdb.org/t/p/w500/abc123.jpg',
    bannerUrl: null,
    markableEpisodeCount: 379,
    year: '2004',
    genres: ['Animation'],
    network: 'TV Tokyo',
    isAnime: true,
    averageRuntime: 24,
    seasons: [],
  };

  it('converts the poster URL back to a raw path', () => {
    expect(catalogueRowFromSummary(summary)?.poster_path).toBe('/abc123.jpg');
  });

  it('keeps a null poster null', () => {
    expect(
      catalogueRowFromSummary({ ...summary, posterUrl: null })?.poster_path
    ).toBe(null);
  });

  it('returns null for a null summary', () => {
    expect(catalogueRowFromSummary(null)).toBe(null);
  });
});

describe('catalogueRowFromDetails', () => {
  it('derives the same episode count as the raw-JSON path', () => {
    const fromJson = catalogueRowFromTmdb(30984, FULL);
    const fromDetails = catalogueRowFromDetails(
      30984,
      {
        name: 'Bleach',
        year: '2004',
        genres: ['Animation', 'Action & Adventure'],
        posterUrl: 'https://image.tmdb.org/t/p/w500/abc123.jpg',
        averageRuntime: 24,
      } as ShowDetails,
      {
        seasons: [
          { seasonNumber: 0, episodeCount: 4 },
          { seasonNumber: 1, episodeCount: 366 },
          { seasonNumber: 2, episodeCount: 53 },
        ],
        latestEpisode: { seasonNumber: 2, episodeNumber: 13 },
      } as ShowMeta
    );
    expect(fromDetails).toEqual(fromJson);
  });
});

describe('deriveMarkableEpisodeCount', () => {
  it('treats a season-0 last-aired episode as all known regular episodes aired', () => {
    expect(
      deriveMarkableEpisodeCount({
        seasons: [
          { seasonNumber: 1, episodeCount: 10 },
          { seasonNumber: 2, episodeCount: 12 },
        ],
        lastAired: { seasonNumber: 0, episodeNumber: 3 },
      })
    ).toBe(22);
  });

  it('counts full prior seasons plus the episode number within a middle last-aired season', () => {
    expect(
      deriveMarkableEpisodeCount({
        seasons: [
          { seasonNumber: 1, episodeCount: 10 },
          { seasonNumber: 2, episodeCount: 12 },
          { seasonNumber: 3, episodeCount: 8 },
        ],
        lastAired: { seasonNumber: 2, episodeNumber: 5 },
      })
    ).toBe(15);
  });

  it('counts only the episode number when the last-aired episode is in the first season', () => {
    expect(
      deriveMarkableEpisodeCount({
        seasons: [
          { seasonNumber: 1, episodeCount: 10 },
          { seasonNumber: 2, episodeCount: 12 },
          { seasonNumber: 3, episodeCount: 8 },
        ],
        lastAired: { seasonNumber: 1, episodeNumber: 4 },
      })
    ).toBe(4);
  });

  it('counts all prior seasons plus the episode number when the last-aired episode is in the last season', () => {
    expect(
      deriveMarkableEpisodeCount({
        seasons: [
          { seasonNumber: 1, episodeCount: 10 },
          { seasonNumber: 2, episodeCount: 12 },
          { seasonNumber: 3, episodeCount: 8 },
        ],
        lastAired: { seasonNumber: 3, episodeNumber: 6 },
      })
    ).toBe(28);
  });

  it('returns 0 when there is no last-aired episode', () => {
    expect(
      deriveMarkableEpisodeCount({
        seasons: [
          { seasonNumber: 1, episodeCount: 10 },
          { seasonNumber: 2, episodeCount: 12 },
        ],
        lastAired: null,
      })
    ).toBe(0);
  });

  it('excludes a season-0 entry in seasons from the total', () => {
    expect(
      deriveMarkableEpisodeCount({
        seasons: [
          { seasonNumber: 0, episodeCount: 4 },
          { seasonNumber: 1, episodeCount: 10 },
        ],
        lastAired: { seasonNumber: 1, episodeNumber: 10 },
      })
    ).toBe(10);
  });
});

describe('catalogueShowFromRow', () => {
  it('builds the poster URL from the stored path', () => {
    expect(
      catalogueShowFromRow({
        tmdb_show_id: 30984,
        name: 'Bleach',
        year: '2004',
        genres: ['Animation'],
        poster_path: '/abc123.jpg',
        markable_episode_count: 406,
        average_runtime: 24,
      })
    ).toEqual({
      id: 30984,
      name: 'Bleach',
      year: '2004',
      genres: ['Animation'],
      posterUrl: 'https://image.tmdb.org/t/p/w500/abc123.jpg',
      markableEpisodeCount: 406,
    });
  });

  it('keeps a null poster path null', () => {
    expect(
      catalogueShowFromRow({
        tmdb_show_id: 1,
        name: 'X',
        year: null,
        genres: [],
        poster_path: null,
        markable_episode_count: 0,
        average_runtime: null,
      }).posterUrl
    ).toBe(null);
  });
});

describe('catalogueShowFromSummary', () => {
  it('narrows a ShowSummary to the catalogue shape', () => {
    expect(
      catalogueShowFromSummary({
        id: 1399,
        name: 'Game of Thrones',
        posterUrl: 'https://image.tmdb.org/t/p/w500/got.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/w1280/banner.jpg',
        markableEpisodeCount: 73,
        year: '2011',
        genres: ['Drama'],
        network: 'HBO',
        isAnime: false,
        averageRuntime: 60,
        seasons: [{ seasonNumber: 1, episodeCount: 10 }],
      })
    ).toEqual({
      id: 1399,
      name: 'Game of Thrones',
      year: '2011',
      genres: ['Drama'],
      posterUrl: 'https://image.tmdb.org/t/p/w500/got.jpg',
      markableEpisodeCount: 73,
    });
  });

  it('carries a custom poster through, since overrides are applied before narrowing', () => {
    expect(
      catalogueShowFromSummary({
        id: 1,
        name: 'X',
        posterUrl: 'https://example.com/custom.jpg',
        bannerUrl: null,
        markableEpisodeCount: 0,
        year: null,
        genres: [],
        network: null,
        isAnime: false,
        averageRuntime: null,
        seasons: [],
      }).posterUrl
    ).toBe('https://example.com/custom.jpg');
  });
});

describe('selectMissingIds', () => {
  it('returns ids with no catalogue row', () => {
    expect(selectMissingIds([1, 2, 3], new Set([2]))).toEqual([1, 3]);
  });

  it('returns nothing when every id is cached', () => {
    expect(selectMissingIds([1, 2], new Set([1, 2]))).toEqual([]);
  });

  it('returns everything when the catalogue is empty', () => {
    expect(selectMissingIds([1, 2], new Set())).toEqual([1, 2]);
  });

  it('deduplicates', () => {
    expect(selectMissingIds([1, 1, 2], new Set())).toEqual([1, 2]);
  });
});

describe('selectShowsNeedingRefetch', () => {
  it('refetches an id with no catalogue row at all', () => {
    expect(
      selectShowsNeedingRefetch([1, 2], new Set(), new Set([1, 2]))
    ).toEqual([1, 2]);
  });

  it('refetches an id that has a catalogue row but no season totals — the exact bug this closes', () => {
    expect(
      selectShowsNeedingRefetch([1], new Set([1]), new Set())
    ).toEqual([1]);
  });

  it('does not refetch an id present in both the catalogue and season totals', () => {
    expect(
      selectShowsNeedingRefetch([1], new Set([1]), new Set([1]))
    ).toEqual([]);
  });

  it('takes the union: either gap alone is enough to trigger a refetch', () => {
    // 1: has catalogue row, missing season totals.
    // 2: missing catalogue row, has season totals (should not happen in
    //    practice since resolveShowSummaries writes both, but the union
    //    must still catch it defensively).
    // 3: has neither.
    // 4: has both — the only one that should be left out.
    expect(
      selectShowsNeedingRefetch(
        [1, 2, 3, 4],
        new Set([1, 4]),
        new Set([2, 4])
      )
    ).toEqual([1, 2, 3]);
  });

  it('deduplicates requested ids', () => {
    expect(
      selectShowsNeedingRefetch([1, 1, 2], new Set(), new Set())
    ).toEqual([1, 2]);
  });

  it('returns nothing when every id is fully cached', () => {
    expect(
      selectShowsNeedingRefetch([1, 2], new Set([1, 2]), new Set([1, 2]))
    ).toEqual([]);
  });
});
