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

// Shared shape both the TVDB lookup and the TMDB-fallback lookup map into,
// so the detail page renders one consistent layout regardless of which
// source actually supplied the data.
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
};

export type SeasonEpisode = {
  episodeNumber: number;
  name: string;
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

// Page metadata that always comes from TMDB regardless of which source
// supplied the name/overview/images/genres/cast/status/etc above — TMDB
// already returns seasons, episodes, and similar shows in a ready-to-render
// shape, while assembling the same from TVDB's raw episode list would need
// extra per-show aggregation for no benefit.
export type ShowMeta = {
  contentRating: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  premiereDate: string | null;
  lastAiredDate: string | null;
  nextEpisodeDate: string | null;
  seasons: Season[];
  latestEpisode: LatestEpisode | null;
  similar: SimilarShow[];
};

export type TVDBLoginRaw = {
  data?: { token?: string };
};

export type TVDBSearchResultRaw = {
  id: string; // e.g. "series-81189"
  name: string;
};

export type TVDBArtworkRaw = {
  image: string;
  type: number;
  score: number;
};

export type TVDBGenreRaw = {
  name: string;
};

export type TVDBCompanyRaw = {
  name: string;
};

export type TVDBCharacterRaw = {
  name: string; // character name
  personName: string; // actor name
  // The actor's photo is usually here, not personImgURL — TVDB frequently
  // leaves personImgURL null even when `image` is populated.
  image: string | null;
  personImgURL: string | null;
  peopleType: string; // "Actor" for cast members
  sort: number;
};

export type TVDBTranslationEntry = {
  language: string;
  name?: string;
  overview?: string;
};

export type TVDBTranslationsRaw = {
  nameTranslations?: TVDBTranslationEntry[];
  overviewTranslations?: TVDBTranslationEntry[];
};

export type TVDBSeriesExtendedRaw = {
  name: string;
  overview: string | null;
  year: string | null;
  image: string | null;
  artworks?: TVDBArtworkRaw[];
  genres?: TVDBGenreRaw[];
  originalNetwork?: TVDBCompanyRaw | null;
  characters?: TVDBCharacterRaw[];
  translations?: TVDBTranslationsRaw;
  status?: { name: string } | null;
  averageRuntime?: number | null;
  originalLanguage?: string | null;
  originalCountry?: string | null;
};

export type TMDBEpisodeRaw = {
  name: string;
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
