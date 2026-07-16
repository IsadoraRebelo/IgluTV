import type { DisplayStatus, ShowStatus, ShowSummary } from '@/types';

export type WatchedShowEntry = {
  show: ShowSummary;
  watchedCount: number;
  status: ShowStatus;
  displayStatus: DisplayStatus;
  decade: number | null;
  createdAt: string;
};

export type SortKey = 'release-date' | 'alphabetical' | 'date-added' | 'progress';
export type SortDirection = 'asc' | 'desc';
export type Density = 'dense' | 'large';
