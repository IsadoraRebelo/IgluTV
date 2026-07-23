import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from './limit-concurrency';

describe('mapWithConcurrency', () => {
  it('returns results in input order', async () => {
    const out = await mapWithConcurrency([3, 1, 2], 2, async (n) => {
      await new Promise((r) => setTimeout(r, n * 10));
      return n * 2;
    });
    expect(out).toEqual([6, 2, 4]);
  });

  it('never exceeds the concurrency cap', async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 3, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return null;
    });
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('propagates a rejection without stranding the queue', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      })
    ).rejects.toThrow('boom');
  });

  it('handles an empty input', async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  });

  it('treats a cap below 1 as 1 rather than deadlocking', async () => {
    expect(await mapWithConcurrency([1, 2], 0, async (n) => n)).toEqual([1, 2]);
  });
});
