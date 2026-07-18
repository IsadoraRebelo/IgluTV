'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { useShowTrackingContext } from '@/components';
import {
  getFavouritePresentation,
  getMarkWatchedPresentation,
  getStatusActionLabel,
  getVisibleActions,
} from '@/components/ShowTracker/show-actions';

import type { ShowStatus } from '@/types';

import { cn } from '@/utils/cn';

export function ShowActionsMenu({
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

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="More options"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 md:h-9 md:w-9"
        >
          <MoreHorizontal className="h-3 w-3 md:h-5 md:w-5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out bg-muted z-50 w-64 rounded-lg p-2 shadow-2xl ring-1 ring-white/10"
        >
          {!isLoggedIn ? (
            <DropdownMenu.Item
              onSelect={openAuthDialog}
              className="text-text-primary rounded-md bg-white/5 px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-white/10"
            >
              Sign in to log, rate or review
            </DropdownMenu.Item>
          ) : (
            visibleActions.map((action) => {
              const { icon, label, id, status, activeColor } = action;
              const isMarkWatched = id === 'mark-watched';
              const isFavouriteAction = id === 'favourite';
              const isActiveStatus =
                status !== undefined && showStatus === status;
              const isWatchLater = status === 'watch_later';

              if (status !== undefined) {
                const displayLabel = getStatusActionLabel(action, showStatus);

                return (
                  <DropdownMenu.Item
                    key={status}
                    disabled={
                      isSettingShowStatus || (isActiveStatus && !isWatchLater)
                    }
                    onSelect={() => onSetShowStatus(status)}
                    className="text-text-primary flex items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-white/5"
                  >
                    <span className={cn(isActiveStatus && activeColor)}>
                      {icon}
                    </span>
                    {displayLabel}
                  </DropdownMenu.Item>
                );
              }

              const markWatched = getMarkWatchedPresentation(action, {
                showStatus,
                isShowCompleted,
                isShowCaughtUp,
                isShowFullyWatched,
              });
              const favourite = getFavouritePresentation(action, isFavourite);
              const displayLabel = isMarkWatched
                ? markWatched.label
                : isFavouriteAction
                  ? favourite.label
                  : label;
              const displayIcon = isMarkWatched
                ? markWatched.icon
                : isFavouriteAction
                  ? favourite.icon
                  : icon;
              const shouldUseActiveColor = isMarkWatched
                ? markWatched.shouldUseActiveColor
                : isFavouriteAction
                  ? favourite.shouldUseActiveColor
                  : false;
              const isInteractive = isMarkWatched || isFavouriteAction;

              return (
                <DropdownMenu.Item
                  key={label}
                  disabled={
                    (isMarkWatched &&
                      (isMarkingShowWatched || isSettingShowStatus)) ||
                    (isFavouriteAction && isTogglingFavourite)
                  }
                  onSelect={
                    isMarkWatched
                      ? onMarkShowWatched
                      : isFavouriteAction
                        ? onToggleFavourite
                        : undefined
                  }
                  className={`text-text-primary flex items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-white/5 ${
                    isInteractive ? '' : 'cursor-default'
                  }`}
                >
                  <span className={cn(shouldUseActiveColor && activeColor)}>
                    {displayIcon}
                  </span>
                  {displayLabel}
                </DropdownMenu.Item>
              );
            })
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
