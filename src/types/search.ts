export type TvShowSearchResult = {
  id: number;
  name: string;
  originalName: string | null;
  overview: string;
  posterUrl: string | null;
  firstAirDate: string | null;
  voteAverage: number;
  isAnime: boolean;
};

export type PersonSearchResult = {
  id: number;
  name: string;
  profileUrl: string | null;
  knownForNames: string[];
};

export type TMDBSearchTvRaw = {
  id: number;
  name: string;
  original_name: string;
  original_language: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string | null;
  vote_average: number;
  genre_ids: number[];
  origin_country: string[];
};

export type TMDBSearchPersonRaw = {
  id: number;
  name: string;
  profile_path: string | null;
  known_for: { name?: string; title?: string }[];
};
