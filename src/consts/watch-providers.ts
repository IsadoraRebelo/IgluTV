// Curated so the country picker stays short — extend as the user base grows.
export const WATCH_PROVIDER_COUNTRIES = [
  'US',
  'GB',
  'CA',
  'AU',
  'BR',
  'PT',
  'ES',
  'FR',
  'DE',
  'IT',
  'NL',
  'MX',
  'AR',
  'IN',
  'JP',
] as const;

export const DEFAULT_WATCH_PROVIDER_COUNTRY = 'US';

// Order used to pick fallback countries when a provider isn't available in
// the user's chosen country.
export const WATCH_PROVIDER_PRIORITY_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'BR'];

export const WATCH_PROVIDER_FALLBACK_COUNT = 5;

// Providers are sorted by TMDB's display_priority (most popular first), then
// capped to this many rows.
export const WATCH_PROVIDER_MAX_COUNT = 6;
