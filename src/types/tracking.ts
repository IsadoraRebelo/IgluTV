export type ShowStatus =
  | 'watching'
  | 'watch_later'
  | 'paused'
  | 'dropped'
  | 'completed';

export type ShowTracking = {
  tmdbShowId: number;
  status: ShowStatus;
  isFavourite: boolean;
};

export type EpisodeWatch = {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  watchedOn: string;
};
