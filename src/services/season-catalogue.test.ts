import { describe, expect, it } from 'vitest';

import { seasonRowsFromTmdb } from './season-catalogue';

// House of the Dragon's real shape: seasons 1 and 2 done, season 3 airing.
const AIRING = {
  status: 'Returning Series',
  seasons: [
    { season_number: 0, episode_count: 81 },
    { season_number: 1, episode_count: 10 },
    { season_number: 2, episode_count: 8 },
    { season_number: 3, episode_count: 8 },
  ],
  last_episode_to_air: { season_number: 3, episode_number: 5 },
  next_episode_to_air: { season_number: 3, episode_number: 6 },
};

describe('seasonRowsFromTmdb', () => {
  it('marks seasons before the airing one as finished', () => {
    const rows = seasonRowsFromTmdb(94997, AIRING);
    const s1 = rows.find((r) => r.season_number === 1);
    const s2 = rows.find((r) => r.season_number === 2);
    expect(s1).toMatchObject({
      episode_count: 10,
      aired_count: 10,
      finished_airing: true,
    });
    expect(s2).toMatchObject({
      episode_count: 8,
      aired_count: 8,
      finished_airing: true,
    });
  });

  it('leaves the airing season unfinished with a partial aired count', () => {
    const s3 = seasonRowsFromTmdb(94997, AIRING).find(
      (r) => r.season_number === 3
    );
    expect(s3).toMatchObject({
      episode_count: 8,
      aired_count: 5,
      finished_airing: false,
    });
  });

  it('marks every season finished when the show has ended', () => {
    const rows = seasonRowsFromTmdb(1, {
      ...AIRING,
      status: 'Ended',
      next_episode_to_air: null,
    });
    expect(
      rows.filter((r) => r.season_number > 0).every((r) => r.finished_airing)
    ).toBe(true);
    // AIRING's last_episode_to_air is S3E5, so season 3 (episode_count 8) is
    // itself an instance of "cancelled part-way through the final season" —
    // only what demonstrably aired counts.
    expect(rows.find((r) => r.season_number === 3)).toMatchObject({
      aired_count: 5,
      finished_airing: true,
    });
  });

  // Rule 3 — without it a finale you just watched would not count as finishing
  // the season until the NEXT season started, possibly years later.
  it('finishes the airing season once its finale has aired and nothing is scheduled', () => {
    const s3 = seasonRowsFromTmdb(1, {
      ...AIRING,
      last_episode_to_air: { season_number: 3, episode_number: 8 },
      next_episode_to_air: null,
    }).find((r) => r.season_number === 3);
    expect(s3).toMatchObject({ aired_count: 8, finished_airing: true });
  });

  it('does not finish the airing season while a next episode is scheduled', () => {
    const s3 = seasonRowsFromTmdb(1, {
      ...AIRING,
      last_episode_to_air: { season_number: 3, episode_number: 8 },
      next_episode_to_air: { season_number: 3, episode_number: 9 },
    }).find((r) => r.season_number === 3);
    expect(s3?.finished_airing).toBe(false);
  });

  it('treats a season after the airing one as unaired, not finished', () => {
    const rows = seasonRowsFromTmdb(1, {
      ...AIRING,
      seasons: [...AIRING.seasons, { season_number: 4, episode_count: 8 }],
    });
    expect(rows.find((r) => r.season_number === 4)).toMatchObject({
      aired_count: 0,
      finished_airing: false,
    });
  });

  it('keeps season 0 but never marks it finished', () => {
    const s0 = seasonRowsFromTmdb(94997, AIRING).find(
      (r) => r.season_number === 0
    );
    expect(s0).toMatchObject({ season_number: 0, finished_airing: false });
  });

  it('returns nothing for a show with no episodes ever aired', () => {
    const rows = seasonRowsFromTmdb(1, {
      status: 'In Production',
      seasons: [{ season_number: 1, episode_count: 8 }],
      last_episode_to_air: null,
      next_episode_to_air: null,
    });
    expect(rows.find((r) => r.season_number === 1)).toMatchObject({
      aired_count: 0,
      finished_airing: false,
    });
  });

  it('returns an empty array for a null response', () => {
    expect(seasonRowsFromTmdb(1, null)).toEqual([]);
  });

  it('tolerates a null episode_count', () => {
    const rows = seasonRowsFromTmdb(1, {
      status: 'Ended',
      seasons: [{ season_number: 1, episode_count: null }],
      last_episode_to_air: { season_number: 1, episode_number: 3 },
      next_episode_to_air: null,
    });
    expect(rows[0]).toMatchObject({
      episode_count: 0,
      aired_count: 0,
      finished_airing: false,
    });
  });

  it('never marks season 0 finished under an Ended show', () => {
    const rows = seasonRowsFromTmdb(1, {
      ...AIRING,
      status: 'Ended',
      next_episode_to_air: null,
    });
    expect(rows.find((r) => r.season_number === 0)).toMatchObject({
      finished_airing: false,
    });
  });

  it('does not mark an announced-but-never-aired season finished under a Canceled show', () => {
    const rows = seasonRowsFromTmdb(1, {
      ...AIRING,
      status: 'Canceled',
      next_episode_to_air: null,
      seasons: [...AIRING.seasons, { season_number: 4, episode_count: 10 }],
    });
    expect(rows.find((r) => r.season_number === 4)).toMatchObject({
      aired_count: 0,
      finished_airing: false,
    });
  });

  it('does not finish a season with a zero episode_count under an Ended show', () => {
    const rows = seasonRowsFromTmdb(1, {
      status: 'Ended',
      seasons: [{ season_number: 1, episode_count: 0 }],
      last_episode_to_air: { season_number: 1, episode_number: 3 },
      next_episode_to_air: null,
    });
    expect(rows[0]).toMatchObject({ finished_airing: false });
  });

  it('caps aired_count at the last aired episode when cancelled part-way through the final season', () => {
    const rows = seasonRowsFromTmdb(1, {
      status: 'Ended',
      seasons: [{ season_number: 3, episode_count: 8 }],
      last_episode_to_air: { season_number: 3, episode_number: 5 },
      next_episode_to_air: null,
    });
    expect(rows[0]).toMatchObject({ aired_count: 5, finished_airing: true });
  });

  it('marks a fully-aired middle season of an Ended show finished with aired_count === episode_count', () => {
    const rows = seasonRowsFromTmdb(1, {
      ...AIRING,
      status: 'Ended',
      next_episode_to_air: null,
    });
    const s2 = rows.find((r) => r.season_number === 2);
    expect(s2).toMatchObject({
      aired_count: 8,
      episode_count: 8,
      finished_airing: true,
    });
  });
});
