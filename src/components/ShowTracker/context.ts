'use client';

import { createContext, useContext } from 'react';

import type { Season, ShowStatus } from '@/types';

export type ShowTrackingContextValue = {
  watchedDates: Map<string, (string | null)[]>;
  pendingKeys: Set<string>;
  onToggleEpisode: (seasonNumber: number, episodeNumber: number) => void;
  onRewatchEpisode: (seasonNumber: number, episodeNumber: number) => void;
  onRemoveLastEpisodeRewatch: (
    seasonNumber: number,
    episodeNumber: number
  ) => void;
  onUpdateEpisodeWatchDate: (
    seasonNumber: number,
    episodeNumber: number,
    previousDate: string | null,
    nextDate: string | null
  ) => void;
  onToggleSeason: (season: Season) => void;
  onRewatchSeason: (season: Season) => void;
  onRemoveLastSeasonRewatch: (season: Season) => void;
  onMarkShowWatched: () => void;
  isMarkingShowWatched: boolean;
  isShowFullyWatched: boolean;
  isShowCompleted: boolean;
  isShowCaughtUp: boolean;
  showStatus: ShowStatus | null;
  onSetShowStatus: (status: ShowStatus) => void;
  isSettingShowStatus: boolean;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  isTogglingFavourite: boolean;
  isLoggedIn: boolean;
  openAuthDialog: () => void;
};

export const ShowTrackingContext =
  createContext<ShowTrackingContextValue | null>(null);

export function useShowTrackingContext(): ShowTrackingContextValue {
  const value = useContext(ShowTrackingContext);
  if (!value) {
    throw new Error(
      'useShowTrackingContext must be used within a ShowTrackingProvider'
    );
  }
  return value;
}
