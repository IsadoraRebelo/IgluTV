export type ShowStatus =
  'watching' | 'watch_later' | 'paused' | 'dropped' | 'completed';

export type DisplayStatus =
  'ongoing' | 'caught-up' | 'paused' | 'dropped' | 'finished';

export type ShowImageKind = 'poster' | 'banner';

export type ShowTracking = {
  tmdbShowId: number;
  status: ShowStatus;
  isFavourite: boolean;
  skipCatchUpPrompt: boolean;
  createdAt: string;
  customPosterUrl: string | null;
  customBannerUrl: string | null;
};

export type EpisodeWatch = {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  watchedOn: string | null;
};
