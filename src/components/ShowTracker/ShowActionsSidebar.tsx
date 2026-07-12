'use client';

import type { ReactNode } from 'react';
import type { ShowStatus } from '@/types';

import { cn } from '@/utils/cn';

import {
  getFavouritePresentation,
  getMarkWatchedPresentation,
  getStatusActionLabel,
  getVisibleActions,
} from './show-actions';
import { useShowTrackingContext } from './ShowTrackingContext';

export function ShowActionsSidebar({
  actions,
}: {
  actions: {
    id?: string;
    status?: ShowStatus;
    icon: ReactNode;
    reviveIcon?: ReactNode;
    finishedIcon?: ReactNode;
    label: string;
    activeColor?: string;
  }[];
}) {
  const {
    watchedDates,
    onMarkShowWatched,
    isMarkingShowWatched,
    isShowFullyWatched,
    isShowCompleted,
    isShowCaughtUp,
    showStatus,
    onSetShowStatus,
    isSettingShowStatus,
    isFavourite,
    onToggleFavourite,
    isTogglingFavourite,
    isLoggedIn,
    openAuthDialog,
  } = useShowTrackingContext();

  const visibleActions = getVisibleActions(actions, {
    showStatus,
    isShowCompleted,
    isShowCaughtUp,
    isShowFullyWatched,
    watchedDatesCount: watchedDates.size,
  });

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={openAuthDialog}
        className="text-md rounded-md bg-white/5 px-3 py-2.5 text-left text-[#c2d0dd] hover:bg-white/10"
      >
        Sign in to log, rate or review
      </button>
    );
  }

  return (
    <>
      {visibleActions.map((action) => {
        if (action.id === 'mark-watched') {
          const { label, icon, shouldUseActiveColor } =
            getMarkWatchedPresentation(action, {
              showStatus,
              isShowCompleted,
              isShowCaughtUp,
              isShowFullyWatched,
            });

          return (
            <button
              key={action.label}
              type="button"
              disabled={isMarkingShowWatched || isSettingShowStatus}
              onClick={onMarkShowWatched}
              className="text-md flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-[#c2d0dd] hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <span
                className={cn(
                  shouldUseActiveColor && action.activeColor
                )}
              >
                {icon}
              </span>
              {label}
            </button>
          );
        }

        if (action.id === 'favourite') {
          const { label, icon, shouldUseActiveColor } =
            getFavouritePresentation(action, isFavourite);

          return (
            <button
              key={action.label}
              type="button"
              disabled={isTogglingFavourite}
              onClick={onToggleFavourite}
              className="text-md flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-[#c2d0dd] hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <span
                className={cn(
                  shouldUseActiveColor && action.activeColor
                )}
              >
                {icon}
              </span>
              {label}
            </button>
          );
        }

        if (action.status) {
          const isActive = showStatus === action.status;
          const label = getStatusActionLabel(action, showStatus);
          const isWatchLater = action.status === 'watch_later';

          return (
            <button
              key={action.status}
              type="button"
              disabled={isSettingShowStatus || (isActive && !isWatchLater)}
              onClick={() => onSetShowStatus(action.status!)}
              className="text-md flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-[#c2d0dd] hover:bg-white/5 disabled:pointer-events-none"
            >
              <span className={cn(isActive && action.activeColor)}>
                {action.icon}
              </span>
              {label}
            </button>
          );
        }

        return (
          <div
            key={action.label}
            className="text-md flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-[#c2d0dd] hover:bg-white/5"
          >
            {action.icon}
            {action.label}
          </div>
        );
      })}
    </>
  );
}
