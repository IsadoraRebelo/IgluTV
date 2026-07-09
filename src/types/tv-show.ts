export type TvShow = {
  id: number;
  name: string;
  overview: string;
  posterUrl: string | null;
  firstAirDate: string;
  voteAverage: number;
};

export type TMDBTvShowRaw = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
};

export type CastMember = {
  actorName: string;
  character: string;
  imageUrl: string | null;
};

// Show detail fields, all sourced from TMDB.
export type ShowDetails = {
  name: string;
  overview: string;
  year: string | null;
  bannerUrl: string | null;
  posterUrl: string | null;
  genres: string[];
  network: string | null;
  cast: CastMember[];
  status: string | null;
  averageRuntime: number | null;
  originalLanguage: string | null;
  originalCountry: string | null;
  contentRating: string | null;
  premiereDate: string | null;
  lastAiredDate: string | null;
  nextEpisodeDate: string | null;
};

export type SeasonEpisode = {
  episodeNumber: number;
  name: string;
  overview: string;
  runtime: number | null;
  airDate: string | null;
  imageUrl: string | null;
};

export type Season = {
  name: string;
  seasonNumber: number;
  airDate: string | null;
  episodeCount: number | null;
  posterUrl: string | null;
  episodes: SeasonEpisode[];
};

export type LatestEpisode = {
  name: string;
  overview: string;
  seasonNumber: number;
  episodeNumber: number;
  airDate: string | null;
  runtime: number | null;
  imageUrl: string | null;
};

export type SimilarShow = {
  id: number;
  name: string;
  posterUrl: string | null;
  // TMDB's own "match" percentage, as shown on themoviedb.org's
  // recommendations section: round(vote_average * 10).
  matchPercentage: number | null;
};

// Additional show metadata (seasons, latest episode, recommendations),
// all sourced from TMDB.
export type ShowMeta = {
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  seasons: Season[];
  latestEpisode: LatestEpisode | null;
  similar: SimilarShow[];
};

export type TMDBEpisodeRaw = {
  name: string;
  overview: string;
  season_number: number;
  episode_number: number;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
};

export type TMDBSeasonRaw = {
  name: string;
  season_number: number;
  air_date: string | null;
  episode_count: number | null;
  poster_path: string | null;
};

export type TMDBSeasonEpisodeRaw = {
  name: string;
  episode_number: number;
  overview: string;
  runtime: number | null;
  air_date: string | null;
  still_path: string | null;
};

export type TMDBSeasonDetailRaw = {
  episodes?: TMDBSeasonEpisodeRaw[];
};

export type TMDBSeriesDetailsRaw = {
  name: string;
  overview: string;
  first_air_date: string;
  last_air_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  original_language?: string;
  origin_country?: string[];
  genres?: { name: string }[];
  networks?: { name: string }[];
  seasons?: TMDBSeasonRaw[];
  next_episode_to_air?: TMDBEpisodeRaw | null;
  last_episode_to_air?: TMDBEpisodeRaw | null;
  credits?: {
    cast?: { name: string; character: string; profile_path: string | null }[];
  };
  content_ratings?: {
    results?: { iso_3166_1: string; rating: string }[];
  };
  recommendations?: {
    results?: {
      id: number;
      name: string;
      poster_path: string | null;
      vote_average: number;
    }[];
  };
};
