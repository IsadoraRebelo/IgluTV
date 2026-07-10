'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { useShowTrackingContext } from '@/components';
import type { ShowStatus } from '@/types';

export function ShowActionsMenu({
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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="More options"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-lg bg-[#1c232b] p-2 shadow-2xl ring-1 ring-white/10
            data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
        >
          {visibleActions.map((action) => {
            const { icon, label, id, status } = action;
            const isMarkWatched = id === 'mark-watched';
            const isActiveStatus = status !== undefined && showStatus === status;
            const isWatchLater = status === 'watch_later';

            if (status !== undefined) {
              const displayLabel = isActiveStatus
                ? isWatchLater
                  ? 'Remove from watchlist'
                  : status === 'paused'
                    ? 'Paused'
                    : 'Dropped'
                : label;

              return (
                <DropdownMenu.Item
                  key={status}
                  disabled={isSettingShowStatus || (isActiveStatus && !isWatchLater)}
                  onSelect={() => onSetShowStatus(status)}
                  className={
                    isActiveStatus
                      ? 'flex items-center gap-3 rounded-md bg-white/10 px-3 py-2.5 text-sm font-medium text-white outline-none'
                      : 'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] outline-none data-[highlighted]:bg-white/5 data-[disabled]:opacity-50'
                  }
                >
                  {icon}
                  {displayLabel}
                </DropdownMenu.Item>
              );
            }

            const isRevivingToWatching =
              showStatus === 'paused' || showStatus === 'dropped';
            const isDone = isMarkWatched && isShowFullyWatched && !isRevivingToWatching;
            const displayLabel = isMarkWatched
              ? isRevivingToWatching
                ? 'Back to watching'
                : isShowCaughtUp
                  ? 'All caught up'
                  : label
              : label;

            return (
              <DropdownMenu.Item
                key={label}
                disabled={
                  isMarkWatched && (isMarkingShowWatched || isSettingShowStatus)
                }
                onSelect={isMarkWatched ? onMarkShowWatched : undefined}
                className={
                  isDone
                    ? 'flex items-center gap-3 rounded-md bg-[#66cc24] px-3 py-2.5 text-sm text-[#14181c] outline-none'
                    : `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] outline-none data-[highlighted]:bg-white/5 data-[disabled]:opacity-50 ${
                        isMarkWatched ? '' : 'cursor-default'
                      }`
                }
              >
                {icon}
                {displayLabel}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
