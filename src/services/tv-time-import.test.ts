import { describe, expect, it } from 'vitest';

import {
  buildImportPlan,
  deriveShowStatus,
  type MergeableWatch,
  parseCsv,
  parseSpecialStatus,
  parseTrackingRecords,
  planEpisodeInserts,
  type TvTimeWatchRow,
} from './tv-time-import';

describe('parseCsv', () => {
  it('parses a simple table', () => {
    const rows = parseCsv('a,b\n1,2\n3,4\n');
    expect(rows).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('keeps commas inside quoted fields', () => {
    const rows = parseCsv('name,id\n"Re: ZERO, Starting Life",123\n');
    expect(rows[0].name).toBe('Re: ZERO, Starting Life');
    expect(rows[0].id).toBe('123');
  });

  it('unescapes doubled quotes', () => {
    const rows = parseCsv('name\n"He said ""hi"""\n');
    expect(rows[0].name).toBe('He said "hi"');
  });

  it('keeps newlines inside quoted fields', () => {
    const rows = parseCsv('name,id\n"line1\nline2",7\n');
    expect(rows[0].name).toBe('line1\nline2');
    expect(rows[0].id).toBe('7');
  });

  it('returns an empty array for a header-only file', () => {
    expect(parseCsv('a,b\n')).toEqual([]);
  });
});

const TRACKING_CSV = [
  'ep_no,s_id,user_id,episode_id,series_name,created_at,runtime,key,ep_id,s_no,episode_number,gsi,season_number,bulk_type,series_follow_count,total_movies_runtime,total_series_runtime,movie_watch_count,ep_watch_count,updated_at,is_archived,is_for_later,uuid,followed_at,is_followed,most_recent_ep_watched,is_unitary,rewatch_count,is_special',
  '5,429839,776985,9565635,Perfect Match,2023-04-05 13:48:49,3240,watch-episode-aaa-bbb,9565635,1,5,,1,fill-previous,,,,,,2023-04-05 13:48:49,,,,,,,false,,',
  '10,429839,776985,10487001,Perfect Match,2024-12-10 09:44:12,3360,rewatch-episode-aaa-ccc-1,10487001,2,10,watch-episode-1733823852,2,,,,,,,,,,,,,,,,',
  ',429839,776985,,Perfect Match,2023-04-05 13:48:40,,user-series-aaa,,,,,,,,,,,40,2026-06-19 15:13:18,false,false,aaa,1680702520954582,true,,,,',
  ',,776985,,,2021-11-11 21:40:58,,tracking-stats,,,,,,,,5448720,37623540,787,15309,2026-07-01 11:56:05,,,,,,,,,',
].join('\n');

describe('parseTrackingRecords', () => {
  it('reads watch rows and marks them as first watches', () => {
    const { watches } = parseTrackingRecords(TRACKING_CSV);
    const first = watches.find((w) => !w.isRewatch);
    expect(first).toEqual({
      tvdbShowId: '429839',
      tvdbEpisodeId: '9565635',
      seriesName: 'Perfect Match',
      seasonNumber: 1,
      episodeNumber: 5,
      createdAt: '2023-04-05 13:48:49',
      isRewatch: false,
    });
  });

  it('marks rewatch rows', () => {
    const { watches } = parseTrackingRecords(TRACKING_CSV);
    const rewatch = watches.find((w) => w.isRewatch);
    expect(rewatch?.tvdbEpisodeId).toBe('10487001');
    expect(rewatch?.seasonNumber).toBe(2);
    expect(rewatch?.episodeNumber).toBe(10);
  });

  it('prefers season_number/episode_number over s_no/ep_no', () => {
    const csv = TRACKING_CSV.replace(
      '5,429839,776985,9565635,Perfect Match,2023-04-05 13:48:49,3240,watch-episode-aaa-bbb,9565635,1,5,,1,',
      '2,429839,776985,9565635,Perfect Match,2023-04-05 13:48:49,3240,watch-episode-aaa-bbb,9565635,2,8,,1,'
    );
    const { watches } = parseTrackingRecords(csv);
    const first = watches.find((w) => !w.isRewatch);
    expect(first?.seasonNumber).toBe(1);
    expect(first?.episodeNumber).toBe(8);
  });

  it('reads user-series rows and ignores tracking-stats', () => {
    const { series } = parseTrackingRecords(TRACKING_CSV);
    expect(series).toEqual([
      {
        tvdbShowId: '429839',
        seriesName: 'Perfect Match',
        isFollowed: true,
        isArchived: false,
        isForLater: false,
        followedAt: '2023-04-05T13:48:40.954Z',
      },
    ]);
  });

  it('leaves followedAt null when the export has no followed_at', () => {
    const csv = TRACKING_CSV.replace('1680702520954582', '');
    const { series } = parseTrackingRecords(csv);
    expect(series[0].followedAt).toBe(null);
  });
});

describe('parseSpecialStatus', () => {
  it('reads favourite and for-later rows', () => {
    const csv = [
      'created_at,updated_at,tv_show_name,user_id,tv_show_id,status',
      '2019-01-20 22:24:20,2019-01-20 22:24:20,Bleach,776985,74796,favorite',
      '2025-01-10 11:55:50,2025-01-10 11:55:50,Pokémon,776985,76703,for_later',
    ].join('\n');
    expect(parseSpecialStatus(csv)).toEqual([
      { tvdbShowId: '74796', status: 'favorite' },
      { tvdbShowId: '76703', status: 'for_later' },
    ]);
  });

  it('ignores unknown statuses', () => {
    const csv = [
      'created_at,updated_at,tv_show_name,user_id,tv_show_id,status',
      '2019-01-20 22:24:20,2019-01-20 22:24:20,Bleach,776985,74796,something_else',
    ].join('\n');
    expect(parseSpecialStatus(csv)).toEqual([]);
  });
});

function watch(over: Partial<TvTimeWatchRow> = {}): TvTimeWatchRow {
  return {
    tvdbShowId: '1',
    tvdbEpisodeId: '100',
    seriesName: 'Show',
    seasonNumber: 1,
    episodeNumber: 1,
    createdAt: '2020-05-04 21:00:00',
    isRewatch: false,
    ...over,
  };
}

describe('buildImportPlan', () => {
  it('keeps a normal watch date', () => {
    const [group] = buildImportPlan({
      watches: [watch()],
      series: [],
      specialStatus: [],
    });
    expect(group.watches).toEqual([
      {
        seasonNumber: 1,
        episodeNumber: 1,
        tvdbEpisodeId: '100',
        createdAt: '2020-05-04 21:00:00',
        watchedOn: '2020-05-04',
      },
    ]);
  });

  it('nulls watchedOn for the 2016-06-01 backfill but keeps createdAt', () => {
    const [group] = buildImportPlan({
      watches: [watch({ createdAt: '2016-06-01 02:14:09' })],
      series: [],
      specialStatus: [],
    });
    expect(group.watches[0].watchedOn).toBe(null);
    expect(group.watches[0].createdAt).toBe('2016-06-01 02:14:09');
  });

  it('nulls a rewatch that lands on the first watch date', () => {
    const [group] = buildImportPlan({
      watches: [
        watch({ createdAt: '2021-03-02 10:00:00' }),
        watch({ createdAt: '2021-03-02 23:30:00', isRewatch: true }),
      ],
      series: [],
      specialStatus: [],
    });
    expect(group.watches.map((w) => w.watchedOn)).toEqual(['2021-03-02', null]);
  });

  it('keeps a rewatch on a different day', () => {
    const [group] = buildImportPlan({
      watches: [
        watch({ createdAt: '2021-03-02 10:00:00' }),
        watch({ createdAt: '2025-11-17 08:24:37', isRewatch: true }),
      ],
      series: [],
      specialStatus: [],
    });
    expect(group.watches.map((w) => w.watchedOn)).toEqual([
      '2021-03-02',
      '2025-11-17',
    ]);
  });

  it('keeps episodes sharing a placeholder number but differing by episode id as separate first watches', () => {
    const [group] = buildImportPlan({
      watches: [
        watch({
          tvdbEpisodeId: '900',
          seasonNumber: 3,
          episodeNumber: 0,
          createdAt: '2019-01-01 10:00:00',
        }),
        watch({
          tvdbEpisodeId: '901',
          seasonNumber: 3,
          episodeNumber: 0,
          createdAt: '2019-01-01 20:00:00',
        }),
      ],
      series: [],
      specialStatus: [],
    });
    // Neither is nulled: they are two first watches, not a first watch plus
    // a carried-over rewatch. Both rows fall on the same calendar day, which
    // is the only case where bucketing them together (the bug) would have
    // incorrectly nulled the second one's watchedOn via the
    // carried-over-rewatch rule.
    expect(group.watches.map((w) => w.watchedOn)).toEqual([
      '2019-01-01',
      '2019-01-01',
    ]);
  });

  it('treats a repeated first watch of one episode as a rewatch, keeping the earliest as first', () => {
    const [group] = buildImportPlan({
      watches: [
        watch({ createdAt: '2022-08-09 12:00:00' }),
        watch({ createdAt: '2021-01-01 12:00:00' }),
      ],
      series: [],
      specialStatus: [],
    });
    expect(group.watches.map((w) => w.createdAt)).toEqual([
      '2021-01-01 12:00:00',
      '2022-08-09 12:00:00',
    ]);
    expect(group.watches.map((w) => w.watchedOn)).toEqual([
      '2021-01-01',
      '2022-08-09',
    ]);
  });

  it('emits a group for a followed show with no watches', () => {
    const plan = buildImportPlan({
      watches: [],
      series: [
        {
          tvdbShowId: '9',
          seriesName: 'Followed Only',
          isFollowed: true,
          isArchived: false,
          isForLater: false,
          followedAt: '2023-01-01T00:00:00.000Z',
        },
      ],
      specialStatus: [],
    });
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      tvdbShowId: '9',
      seriesName: 'Followed Only',
      isFollowed: true,
      watches: [],
    });
  });

  it('marks favourites and unions for_later from special status', () => {
    const plan = buildImportPlan({
      watches: [watch({ tvdbShowId: '5' })],
      series: [],
      specialStatus: [
        { tvdbShowId: '5', status: 'favorite' },
        { tvdbShowId: '6', status: 'for_later' },
      ],
    });
    const five = plan.find((g) => g.tvdbShowId === '5');
    const six = plan.find((g) => g.tvdbShowId === '6');
    expect(five?.isFavourite).toBe(true);
    expect(six?.isForLater).toBe(true);
  });

  it('defaults a show with watches but no user-series row to followed', () => {
    const [group] = buildImportPlan({
      watches: [watch()],
      series: [],
      specialStatus: [],
    });
    expect(group.isFollowed).toBe(true);
    expect(group.isArchived).toBe(false);
    expect(group.isForLater).toBe(false);
  });
});

describe('deriveShowStatus', () => {
  const base = {
    isFollowed: true,
    isArchived: false,
    isForLater: false,
    distinctWatchedEpisodes: 0,
    totalEpisodes: 10,
  };

  it('returns watch_later for a for-later show even when complete', () => {
    expect(
      deriveShowStatus({
        ...base,
        isForLater: true,
        distinctWatchedEpisodes: 10,
      })
    ).toBe('watch_later');
  });

  it('returns completed when every episode is watched', () => {
    expect(deriveShowStatus({ ...base, distinctWatchedEpisodes: 10 })).toBe(
      'completed'
    );
  });

  it('prefers completed over dropped for an archived finished show', () => {
    expect(
      deriveShowStatus({
        ...base,
        isArchived: true,
        distinctWatchedEpisodes: 10,
      })
    ).toBe('completed');
  });

  it('returns dropped for an archived unfinished show', () => {
    expect(
      deriveShowStatus({
        ...base,
        isArchived: true,
        distinctWatchedEpisodes: 3,
      })
    ).toBe('dropped');
  });

  it('returns dropped for an unfollowed unfinished show', () => {
    expect(
      deriveShowStatus({
        ...base,
        isFollowed: false,
        distinctWatchedEpisodes: 3,
      })
    ).toBe('dropped');
  });

  it('returns watching for a followed show mid-run', () => {
    expect(deriveShowStatus({ ...base, distinctWatchedEpisodes: 3 })).toBe(
      'watching'
    );
  });

  it('stays watching when TMDB counts unaired episodes', () => {
    expect(
      deriveShowStatus({
        ...base,
        distinctWatchedEpisodes: 8,
        totalEpisodes: 10,
      })
    ).toBe('watching');
  });

  it('never completes a show TMDB has no episodes for', () => {
    expect(
      deriveShowStatus({
        ...base,
        distinctWatchedEpisodes: 0,
        totalEpisodes: 0,
      })
    ).toBe('watching');
  });
});

function mergeable(over: Partial<MergeableWatch> = {}): MergeableWatch {
  return {
    seasonNumber: 1,
    episodeNumber: 1,
    createdAt: '2020-01-01T00:00:00.000Z',
    watchedOn: '2020-01-01',
    ...over,
  };
}

describe('planEpisodeInserts', () => {
  it('inserts the one incoming watch when nothing exists yet (N=0, M=1)', () => {
    const result = planEpisodeInserts([], [mergeable()]);
    expect(result.toInsert).toHaveLength(1);
    expect(result.skipped).toBe(0);
  });

  it('inserts only the later rows past what already exists (N=1, M=3)', () => {
    const oldest = mergeable({ createdAt: '2020-01-01T00:00:00.000Z' });
    const middle = mergeable({ createdAt: '2021-01-01T00:00:00.000Z' });
    const newest = mergeable({ createdAt: '2022-01-01T00:00:00.000Z' });

    const result = planEpisodeInserts(
      [{ seasonNumber: 1, episodeNumber: 1 }],
      // Shuffled to prove the function sorts before slicing.
      [newest, oldest, middle]
    );

    expect(result.toInsert).toHaveLength(2);
    expect(result.skipped).toBe(1);
    expect(result.toInsert.map((w) => w.createdAt)).toEqual([
      middle.createdAt,
      newest.createdAt,
    ]);
  });

  it('inserts nothing and skips the one incoming row when three already exist (N=3, M=1)', () => {
    const existing = [
      { seasonNumber: 1, episodeNumber: 1 },
      { seasonNumber: 1, episodeNumber: 1 },
      { seasonNumber: 1, episodeNumber: 1 },
    ];

    const result = planEpisodeInserts(existing, [mergeable()]);

    expect(result.toInsert).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('is a no-op on a re-run when the two incoming rows already exist (N=2, M=2)', () => {
    const existing = [
      { seasonNumber: 1, episodeNumber: 1 },
      { seasonNumber: 1, episodeNumber: 1 },
    ];
    const incoming = [
      mergeable({ createdAt: '2020-01-01T00:00:00.000Z' }),
      mergeable({ createdAt: '2021-01-01T00:00:00.000Z' }),
    ];

    const result = planEpisodeInserts(existing, incoming);

    expect(result.toInsert).toHaveLength(0);
    expect(result.skipped).toBe(2);
  });

  it('counts an episode present only in existing rows toward distinctEpisodes', () => {
    const result = planEpisodeInserts(
      [{ seasonNumber: 1, episodeNumber: 1 }],
      []
    );
    expect(result.distinctEpisodes).toBe(1);
  });

  it('excludes season 0 from distinctEpisodes but includes season 1', () => {
    const result = planEpisodeInserts(
      [],
      [
        mergeable({ seasonNumber: 0, episodeNumber: 1 }),
        mergeable({ seasonNumber: 1, episodeNumber: 1 }),
      ]
    );
    expect(result.distinctEpisodes).toBe(1);
  });

  it('counts three rewatches of one episode as a single distinct episode', () => {
    const result = planEpisodeInserts(
      [],
      [
        mergeable({ createdAt: '2020-01-01T00:00:00.000Z' }),
        mergeable({ createdAt: '2021-01-01T00:00:00.000Z' }),
        mergeable({ createdAt: '2022-01-01T00:00:00.000Z' }),
      ]
    );
    expect(result.distinctEpisodes).toBe(1);
  });

  it('parses a two-digit season correctly when counting distinctEpisodes', () => {
    const result = planEpisodeInserts(
      [],
      [mergeable({ seasonNumber: 10, episodeNumber: 3 })]
    );
    expect(result.distinctEpisodes).toBe(1);
  });

  it('inserts a new episode in full when existing rows belong to a different episode', () => {
    // existingCounts is keyed per episode: existing rows on episodes the
    // import never touches must not reduce how much of a different,
    // untouched-by-existing episode gets inserted. A mutant that instead used
    // existing.length as a flat "already inserted" count for every key would
    // insert 0 here and silently drop the new episode.
    const existing = [
      { seasonNumber: 1, episodeNumber: 1 },
      { seasonNumber: 1, episodeNumber: 2 },
    ];
    const incoming = [mergeable({ seasonNumber: 1, episodeNumber: 3 })];

    const result = planEpisodeInserts(existing, incoming);

    expect(result.toInsert).toHaveLength(1);
    expect(result.skipped).toBe(0);
  });

  it('carries createdAt and watchedOn through to toInsert unchanged, including a null watchedOn', () => {
    const withDate = mergeable({
      createdAt: '2023-02-03T04:05:06.000Z',
      watchedOn: '2023-02-03',
    });
    const withoutDate = mergeable({
      seasonNumber: 1,
      episodeNumber: 2,
      createdAt: '2016-06-01T02:14:09.000Z',
      watchedOn: null,
    });

    const result = planEpisodeInserts([], [withDate, withoutDate]);

    expect(result.toInsert).toEqual(
      expect.arrayContaining([withDate, withoutDate])
    );
  });

  it('inserts nothing on a second run fed the first run output as existing (idempotency)', () => {
    const incoming = [
      mergeable({ createdAt: '2020-01-01T00:00:00.000Z' }),
      mergeable({ createdAt: '2021-01-01T00:00:00.000Z' }),
    ];

    const first = planEpisodeInserts([], incoming);
    expect(first.toInsert).toHaveLength(2);

    const existingAfterFirstRun = first.toInsert.map((w) => ({
      seasonNumber: w.seasonNumber,
      episodeNumber: w.episodeNumber,
    }));

    const second = planEpisodeInserts(existingAfterFirstRun, incoming);
    expect(second.toInsert).toHaveLength(0);
    expect(second.skipped).toBe(2);
  });
});
