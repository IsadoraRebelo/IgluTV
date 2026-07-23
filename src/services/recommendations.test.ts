import { describe, expect, it } from 'vitest';

import { selectRecentSeeds } from './recommendations';

describe('selectRecentSeeds', () => {
  it('sorts by createdAt descending', () => {
    const rows = [
      { id: 1, createdAt: '2024-01-01T00:00:00Z' },
      { id: 2, createdAt: '2024-03-01T00:00:00Z' },
      { id: 3, createdAt: '2024-02-01T00:00:00Z' },
    ];
    expect(selectRecentSeeds(rows, 10).map((r) => r.id)).toEqual([2, 3, 1]);
  });

  it('caps the result at limit', () => {
    const rows = [
      { id: 1, createdAt: '2024-01-01T00:00:00Z' },
      { id: 2, createdAt: '2024-03-01T00:00:00Z' },
      { id: 3, createdAt: '2024-02-01T00:00:00Z' },
    ];
    expect(selectRecentSeeds(rows, 2).map((r) => r.id)).toEqual([2, 3]);
  });

  it('does not mutate the input array', () => {
    const rows = [
      { id: 1, createdAt: '2024-01-01T00:00:00Z' },
      { id: 2, createdAt: '2024-03-01T00:00:00Z' },
    ];
    const original = [...rows];
    selectRecentSeeds(rows, 1);
    expect(rows).toEqual(original);
  });

  it('returns an empty array for an empty input', () => {
    expect(selectRecentSeeds([], 10)).toEqual([]);
  });

  it('returns everything when limit exceeds the input size', () => {
    const rows = [{ id: 1, createdAt: '2024-01-01T00:00:00Z' }];
    expect(selectRecentSeeds(rows, 10)).toHaveLength(1);
  });
});
