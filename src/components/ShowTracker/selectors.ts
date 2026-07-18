import type { Season, ShowStatus } from '@/types';

import {
  episodeKey,
  getDaysUntilAir,
  getWatchCount,
  isShowFinished,
} from './utils';

export type MarkableSeasonEntry = {
  season: Season;
  markableEpisodes: Season['episodes'];
};

// Regular seasons (season 0 excluded) that have at least one markable
// (aired) episode — the target set for both the bulk mark and bulk
// unmark actions, and for deciding whether the whole show counts as
// "fully watched".
export function getRegularMarkableSeasons(
  seasons: Season[]
): MarkableSeasonEntry[] {
  return seasons
    .filter((season) => season.seasonNumber > 0)
    .map((season) => ({
      season,
      markableEpisodes: season.episodes.filter(
        (ep) => getDaysUntilAir(ep.airDate) === null
      ),
    }))
    .filter(({ markableEpisodes }) => markableEpisodes.length > 0);
}

export function getIsShowFullyWatched(
  regularMarkableSeasons: MarkableSeasonEntry[],
  watchedDates: Map<string, (string | null)[]>
): boolean {
  return (
    regularMarkableSeasons.length > 0 &&
    regularMarkableSeasons.every(({ season, markableEpisodes }) =>
      markableEpisodes.every(
        (ep) =>
          getWatchCount(
            watchedDates,
            episodeKey(season.seasonNumber, ep.episodeNumber)
          ) > 0
      )
    )
  );
}

export function getIsShowCompleted(
  isShowFullyWatched: boolean,
  tmdbStatus: string | null
): boolean {
  return isShowFullyWatched && isShowFinished(tmdbStatus);
}

export function getIsShowCaughtUp(
  isShowFullyWatched: boolean,
  tmdbStatus: string | null
): boolean {
  return isShowFullyWatched && !isShowFinished(tmdbStatus);
}

export function getDisplayedShowStatus(
  isShowCompleted: boolean,
  showStatus: ShowStatus | null,
  hasStartedWatching: boolean
): ShowStatus | null {
  return isShowCompleted
    ? 'completed'
    : (showStatus === null || showStatus === 'watch_later') &&
        hasStartedWatching
      ? 'watching'
      : showStatus;
}
