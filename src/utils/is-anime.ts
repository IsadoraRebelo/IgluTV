export const ANIME_GENRE_ID = 16;

export function isAnime(genreIds: number[], originCountry: string[]): boolean {
  return genreIds.includes(ANIME_GENRE_ID) && originCountry.includes('JP');
}
