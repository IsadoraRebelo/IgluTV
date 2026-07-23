import { describe, expect, it, vi } from 'vitest';

import { fetchAllPages } from './tracking';

describe('fetchAllPages', () => {
  it('returns everything from a single short page', async () => {
    const fetchPage = vi.fn(async (limit: number, offset: number) => {
      expect(offset).toBe(0);
      return limit === 1000 ? [1, 2, 3] : [];
    });

    const rows = await fetchAllPages(fetchPage);

    expect(rows).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('pages past an exactly-full page, matching PostgREST\'s 1,000-row cap', async () => {
    const page1 = Array.from({ length: 3 }, (_, i) => i);
    const page2 = [3, 4];

    const fetchPage = vi.fn(async (_limit: number, offset: number) =>
      offset === 0 ? page1 : offset === 3 ? page2 : []
    );

    const rows = await fetchAllPages(fetchPage, 3);

    expect(rows).toEqual([0, 1, 2, 3, 4]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 3, 0);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 3, 3);
  });

  it('stops as soon as an empty page comes back, without an extra call', async () => {
    const fetchPage = vi.fn(async (_limit: number, offset: number) =>
      offset === 0 ? [1, 2] : []
    );

    const rows = await fetchAllPages(fetchPage, 2);

    expect(rows).toEqual([1, 2]);
    // One page of exactly pageSize, one empty page confirming the end —
    // fetchAllPages cannot know a full page was the last one without this.
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('returns an empty array when the first page is empty', async () => {
    const fetchPage = vi.fn(async () => []);

    const rows = await fetchAllPages(fetchPage);

    expect(rows).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('propagates a rejection from fetchPage instead of swallowing it', async () => {
    const fetchPage = vi.fn(async () => {
      throw new Error('boom');
    });

    await expect(fetchAllPages(fetchPage)).rejects.toThrow('boom');
  });
});
