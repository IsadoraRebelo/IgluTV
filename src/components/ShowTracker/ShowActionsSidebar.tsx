'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';

import type { ShowImageKind, ShowStatus } from '@/types';

import { cn } from '@/utils/cn';

import {
  getFavouritePresentation,
  getMarkWatchedPresentation,
  getStatusActionLabel,
  getVisibleActions,
} from './show-actions';
import { ShowImagePickerDialog } from './ShowImagePickerDialog';
import { useShowTrackingContext } from './ShowTrackingContext';

export function ShowActionsSidebar({
  showId,
  showName,
  actions,
}: {
  showId: number;
  showName: string;
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
    customPosterUrl,
    customBannerUrl,
    onApplyCustomImage,
  } = useShowTrackingContext();

  const router = useRouter();
  const [pickerKind, setPickerKind] = useState<ShowImageKind | null>(null);

  const visibleActions = getVisibleActions(actions, {
    showStatus,
    isShowCompleted,
    isShowCaughtUp,
    isShowFullyWatched,
    watchedDatesCount: watchedDates.size,
  });

  function handleApplied(kind: ShowImageKind, url: string | null) {
    onApplyCustomImage(kind, url);
    setPickerKind(null);
    router.refresh();
  }

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={openAuthDialog}
        className="text-md text-text-primary rounded-md bg-white/5 px-3 py-2.5 text-left hover:bg-white/10"
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
              className="text-md text-text-primary flex items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <span className={cn(shouldUseActiveColor && action.activeColor)}>
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
              className="text-md text-text-primary flex items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <span className={cn(shouldUseActiveColor && action.activeColor)}>
                {icon}
              </span>
              {label}
            </button>
          );
        }

        if (action.id === 'change-poster' || action.id === 'change-banner') {
          const kind: ShowImageKind =
            action.id === 'change-poster' ? 'poster' : 'banner';

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => setPickerKind(kind)}
              className="text-md text-text-primary flex items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-white/5"
            >
              {action.icon}
              {action.label}
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
              className="text-md text-text-primary flex items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-white/5 disabled:pointer-events-none"
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
            className="text-md text-text-primary flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 hover:bg-white/5"
          >
            {action.icon}
            {action.label}
          </div>
        );
      })}

      {pickerKind ? (
        <ShowImagePickerDialog
          open
          onOpenChange={(open) => {
            if (!open) setPickerKind(null);
          }}
          showId={showId}
          showName={showName}
          kind={pickerKind}
          currentUrl={
            pickerKind === 'poster' ? customPosterUrl : customBannerUrl
          }
          onApplied={(url) => handleApplied(pickerKind, url)}
        />
      ) : null}
    </>
  );
}
