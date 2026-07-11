'use client';


import type { ShowStatus } from '@/types';

import { cn } from '@/utils/cn';

import { useShowTrackingContext } from './ShowTrackingContext';
import type { ReactNode } from 'react';

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
    isLoggedIn,
    openAuthDialog,
  } = useShowTrackingContext();

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

  const visibleActions = actions.filter((action) => {
    if (action.status === undefined) return true;
    if (isShowCompleted) return false;
    if (action.status === 'watch_later') {
      return showStatus === null || showStatus === 'watch_later';
    }
    return watchedDates.size > 0;
  });

  return (
    <>
      {visibleActions.map((action) => {
        if (action.id === 'mark-watched') {
          const isRevivingToWatching =
            showStatus === 'paused' || showStatus === 'dropped';
          const isFinished = isShowCompleted && !isRevivingToWatching;
          const label = isRevivingToWatching
            ? 'Back to watching'
            : isFinished
              ? 'Finished'
              : isShowCaughtUp
                ? 'All caught up'
                : action.label;
          const icon = isRevivingToWatching
            ? (action.reviveIcon ?? action.icon)
            : isFinished
              ? (action.finishedIcon ?? action.icon)
              : action.icon;

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
                  !isRevivingToWatching &&
                    (isShowCaughtUp || isShowFullyWatched) &&
                    action.activeColor
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
          const isWatchLater = action.status === 'watch_later';
          const label = isActive
            ? isWatchLater
              ? 'Remove from watchlist'
              : action.status === 'paused'
                ? 'Paused'
                : 'Dropped'
            : action.label;

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
