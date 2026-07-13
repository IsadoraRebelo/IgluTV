export const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';
// Poster images rendered larger than ~170px (e.g. the profile page's
// favourites grid, up to ~230px wide) look soft on retina displays when
// sourced from the default w342 base — use this instead.
export const TMDB_POSTER_LARGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
// Episode stills — displayed small (thumbnails, ~220px-tall modal hero).
export const TMDB_BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w780';
// Show hero banner — displayed up to full page width (~450px tall), so it
// needs a bigger source than the episode stills to not look soft.
export const TMDB_BACKDROP_LARGE_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
// Provider logos (Netflix, Disney+, etc.) — small icons, w92 is plenty.
export const TMDB_PROVIDER_LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w92';
