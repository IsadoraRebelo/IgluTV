export type PersonDetails = {
  name: string;
  biography: string;
  profileUrl: string | null;
};

export type PersonCastCredit = {
  showId: number;
  showName: string;
  posterUrl: string | null;
  firstAirDate: string | null;
  year: string | null;
  genreIds: number[];
  popularity: number;
  episodeCount: number;
  character: string;
};

export type TMDBPersonRaw = {
  name: string;
  biography: string;
  profile_path: string | null;
};

export type TMDBPersonTvCreditsRaw = {
  cast?: {
    id: number;
    name: string;
    poster_path: string | null;
    first_air_date: string | null;
    genre_ids: number[];
    popularity: number;
    episode_count: number;
    character: string;
  }[];
};
