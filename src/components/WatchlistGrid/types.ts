import type { ShowSummary } from '@/types';

export type WatchlistEntry = {
  show: ShowSummary;
  decade: number | null;
  createdAt: string;
};

export type WatchlistSortKey = 'release-date' | 'alphabetical' | 'date-added';
export type SortDirection = 'asc' | 'desc';
