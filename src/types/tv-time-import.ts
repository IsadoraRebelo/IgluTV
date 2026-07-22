import type { ShowImportGroup } from '@/services/tv-time-import';

import type { ShowStatus } from './tracking';

export type UnresolvedEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  tvdbEpisodeId: string;
};

export type ShowOutcome =
  | {
      ok: true;
      tvdbShowId: string;
      seriesName: string;
      tmdbShowId: number;
      tmdbName: string;
      matchedByName: boolean;
      status: ShowStatus;
      inserted: number;
      skipped: number;
      unresolvedEpisodes: UnresolvedEpisode[];
      unverifiedEpisodes: number;
      trackingInserted: boolean;
    }
  | {
      ok: false;
      tvdbShowId: string;
      seriesName: string;
      reason: 'show_unmatched' | 'error';
      message: string | null;
      episodeCount: number;
    };

export type ImportBatchRequest = {
  shows: ShowImportGroup[];
};

export type ImportBatchResponse = {
  outcomes: ShowOutcome[];
};
