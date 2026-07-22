import type { ReactNode } from 'react';

import type { ShowStatus } from '@/types';

export type ShowAction = {
  id?: string;
  status?: ShowStatus;
  icon: ReactNode;
  reviveIcon?: ReactNode;
  finishedIcon?: ReactNode;
  label: string;
  activeColor?: string;
};

type SharedState = {
  showStatus: ShowStatus | null;
  isShowCompleted: boolean;
  isShowCaughtUp: boolean;
  isShowFullyWatched: boolean;
  watchedDatesCount: number;
};

export function getVisibleActions(actions: ShowAction[], state: SharedState) {
  return actions.filter((action) => {
    if (action.id === 'change-poster' || action.id === 'change-banner') {
      return state.showStatus !== null;
    }
    if (action.status === undefined) return true;
    if (action.status === 'watch_later') {
      return state.showStatus === null || state.showStatus === 'watch_later';
    }
    if (state.isShowCompleted) return false;
    return state.watchedDatesCount > 0;
  });
}

export function getStatusActionLabel(
  action: ShowAction,
  showStatus: ShowStatus | null
) {
  if (!action.status) return action.label;

  const isActive = showStatus === action.status;
  if (!isActive) return action.label;
  if (action.status === 'watch_later') return 'Remove from watchlist';
  return action.status === 'paused' ? 'Paused' : 'Dropped';
}

export function getFavouritePresentation(
  action: ShowAction,
  isFavourite: boolean
) {
  return {
    label: 'Favourite',
    icon: action.icon,
    shouldUseActiveColor: isFavourite,
  };
}

export function getMarkWatchedPresentation(
  action: ShowAction,
  state: Pick<
    SharedState,
    'showStatus' | 'isShowCompleted' | 'isShowCaughtUp' | 'isShowFullyWatched'
  >
) {
  const isRevivingToWatching =
    state.showStatus === 'paused' || state.showStatus === 'dropped';
  const isFinished = state.isShowCompleted && !isRevivingToWatching;

  const label = isRevivingToWatching
    ? 'Back to watching'
    : isFinished
      ? 'Finished'
      : state.isShowCaughtUp
        ? 'All caught up'
        : action.label;

  const icon = isRevivingToWatching
    ? (action.reviveIcon ?? action.icon)
    : isFinished
      ? (action.finishedIcon ?? action.icon)
      : action.icon;

  const shouldUseActiveColor =
    !isRevivingToWatching && (state.isShowCaughtUp || state.isShowFullyWatched);

  return {
    label,
    icon,
    isRevivingToWatching,
    shouldUseActiveColor,
  };
}
