import {
  WATCH_PROVIDER_FALLBACK_COUNT,
  WATCH_PROVIDER_PRIORITY_COUNTRIES,
} from '@/consts';

import type { WatchProvider } from '@/types';

export type ProviderAvailability = {
  // Whether the provider is available in the user's own chosen country.
  inUserCountry: boolean;
  countries: string[];
};

// Prefers the user's own country; otherwise shows up to
// WATCH_PROVIDER_FALLBACK_COUNT countries from the priority list, and if the
// provider isn't in any of those either, falls back to its first countries
// alphabetically so a row is never empty.
export function getProviderAvailability(
  providerCountries: string[],
  userCountry: string
): ProviderAvailability {
  if (providerCountries.includes(userCountry)) {
    return { inUserCountry: true, countries: [userCountry] };
  }

  const fromPriorityList = WATCH_PROVIDER_PRIORITY_COUNTRIES.filter((country) =>
    providerCountries.includes(country)
  ).slice(0, WATCH_PROVIDER_FALLBACK_COUNT);

  if (fromPriorityList.length > 0) {
    return { inUserCountry: false, countries: fromPriorityList };
  }

  return {
    inUserCountry: false,
    countries: [...providerCountries]
      .sort()
      .slice(0, WATCH_PROVIDER_FALLBACK_COUNT),
  };
}

// Ranks providers so the user's own country outranks the static priority
// list, which in turn outranks everything else. Stable sort keeps the
// server's popularity ordering as the tiebreaker within each rank.
export function sortProvidersByCountryPriority(
  providers: WatchProvider[],
  userCountry: string
): WatchProvider[] {
  const order = [
    userCountry,
    ...WATCH_PROVIDER_PRIORITY_COUNTRIES.filter((code) => code !== userCountry),
  ];

  function rank(provider: WatchProvider): number {
    const index = order.findIndex((code) => provider.countries.includes(code));
    return index === -1 ? order.length : index;
  }

  return [...providers].sort((a, b) => rank(a) - rank(b));
}
