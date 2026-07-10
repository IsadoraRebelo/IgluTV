'use client';

import type { ReactNode } from 'react';

import type { ShowStatus } from '@/types';

import { useShowTrackingContext } from './ShowTrackingContext';

export function ShowActionsSidebar({
  actions,
}: {
  actions: {
    id?: string;
    status?: ShowStatus;
    icon: ReactNode;
    label: string;
  }[];
}) {
  const {
    watchedCounts,
    onMarkShowWatched,
    isMarkingShowWatched,
    isShowFullyWatched,
    isShowCompleted,
    isShowCaughtUp,
    showStatus,
    onSetShowStatus,
    isSettingShowStatus,
  } = useShowTrackingContext();


  const visibleActions = actions.filter((action) => {
    if (action.status === undefined) return true;
    if (isShowCompleted) return false;
    if (action.status === 'watch_later') {
      return showStatus === null || showStatus === 'watch_later';
    }
    return watchedCounts.size > 0;
  });

  return (
    <>
      {visibleActions.map((action) => {
        if (action.id === 'mark-watched') {
          const isRevivingToWatching =
            showStatus === 'paused' || showStatus === 'dropped';
          const label = isRevivingToWatching
            ? 'Back to watching'
            : isShowCaughtUp
              ? 'All caught up'
              : action.label;

          return (
            <button
              key={action.label}
              type="button"
              disabled={isMarkingShowWatched || isSettingShowStatus}
              onClick={onMarkShowWatched}
              className={
                isShowFullyWatched && !isRevivingToWatching
                  ? 'flex items-center gap-3 rounded-md bg-[#66cc24] px-3 py-2.5 text-left text-sm text-[#14181c] disabled:opacity-50'
                  : 'flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-[#c2d0dd] hover:bg-white/5 disabled:opacity-50'
              }
            >
              {action.icon}
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
              className={
                isActive
                  ? 'flex items-center gap-3 rounded-md bg-white/10 px-3 py-2.5 text-left text-sm font-medium text-white disabled:opacity-50'
                  : 'flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-[#c2d0dd] hover:bg-white/5 disabled:opacity-50'
              }
            >
              {action.icon}
              {label}
            </button>
          );
        }

        return (
          <div
            key={action.label}
            className="flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] hover:bg-white/5"
          >
            {action.icon}
            {action.label}
          </div>
        );
      })}
    </>
  );
}
