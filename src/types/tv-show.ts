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
