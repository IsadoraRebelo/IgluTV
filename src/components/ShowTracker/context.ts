'use client';

import { createContext, useContext } from 'react';

import type {
  CastMember,
  LatestEpisode,
  Season,
  ShowImageKind,
  ShowStatus,
} from '@/types';

export type ShowTrackingContextValue = {
  watchedDates: Map<string, (string | null)[]>;
  pendingKeys: Set<string>;
  // seasons is null until loaded — see onLoadSeasons. Callers seeded with
  // a full season tree up front (the show page) get a non-null value
  // immediately and onLoadSeasons is then a no-op.
  seasons: Season[] | null;
  cast: CastMember[];
  seasonsLoading: boolean;
  // Returns the loaded seasons (or the existing ones if already loaded/
  // in flight) so callers that need the tree right away — see
  // handleToggleEpisode's catch-up lookup — can await it instead of only
  // triggering a state update.
  onLoadSeasons: () => Promise<Season[] | null>;
  // Resolves to the server-computed next unwatched episode on a
  // successful mark (null if the show is now fully caught up), or
  // undefined for an unmark or a failed call — see WatchListRow, which
  // uses this to swap in the next episode without a full page refresh.
  onToggleEpisode: (
    seasonNumber: number,
    episodeNumber: number
  ) => Promise<LatestEpisode | null | undefined>;
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
  customPosterUrl: string | null;
  customBannerUrl: string | null;
  onApplyCustomImage: (kind: ShowImageKind, url: string | null) => void;
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
