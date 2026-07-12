'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  DEFAULT_WATCH_PROVIDER_COUNTRY,
  WATCH_PROVIDER_COUNTRIES,
  WATCH_PROVIDER_MAX_COUNT,
  WATCH_PROVIDER_PRIORITY_COUNTRIES,
} from '@/consts';

import type { WatchProvider } from '@/types';

import { getCountryDisplayName } from '@/utils';

import { updateUserCountryAction } from './actions';
import { getProviderAvailability, sortProvidersByCountryPriority } from './utils';

// Preferred countries surface first in the picker, then everything else.
const OTHER_COUNTRIES = WATCH_PROVIDER_COUNTRIES.filter(
  (code) => !(WATCH_PROVIDER_PRIORITY_COUNTRIES as readonly string[]).includes(code)
);

export function WatchProviders({
  providers,
  initialCountry,
  isLoggedIn,
}: {
  providers: WatchProvider[];
  initialCountry: string | null;
  isLoggedIn: boolean;
}) {
  const [country, setCountry] = useState(
    initialCountry ?? DEFAULT_WATCH_PROVIDER_COUNTRY
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const displayedProviders = useMemo(
    () =>
      sortProvidersByCountryPriority(providers, country).slice(
        0,
        WATCH_PROVIDER_MAX_COUNT
      ),
    [providers, country]
  );

  if (providers.length === 0) return null;

  async function handleCountryChange(next: string) {
    const previous = country;
    setCountry(next);

    if (!isLoggedIn) return;

    setIsSaving(true);
    try {
      const result = await updateUserCountryAction(next);
      if (!result.ok) {
        setCountry(previous);
        toast.error(result.message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="mb-2 flex items-center gap-2"
      >
        <h2 className="text-sm font-semibold text-white">Where to watch</h2>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#678] transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : ''
            }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
      >
        <div className="overflow-hidden">
          <ul className="grid grid-cols-2 gap-2">
            {displayedProviders.map((provider) => {
              const availability = getProviderAvailability(
                provider.countries,
                country
              );
              const countryLabel = availability.countries
                .map((code) => getCountryDisplayName(code) ?? code)
                .join(', ');
              // Link to the JustWatch page for whichever country we're showing.
              const href = provider.links[availability.countries[0]];

              const content = (
                <>
                  {provider.logoUrl ? (
                    <Image
                      src={provider.logoUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-md"
                    />
                  ) : (
                    <div className="h-8 w-8 shrink-0 rounded-md bg-[#2c3440]" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm text-[#c2d0dd]">
                      {provider.providerName}
                    </span>
                    <span className="text-xs text-[#8a9bab]">
                      {countryLabel}
                    </span>
                  </div>
                </>
              );

              return (
                <li key={provider.providerId}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-md bg-white/[0.03] px-3 py-2 transition-colors hover:bg-white/[0.06]"
                    >
                      {content}
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-md bg-white/[0.03] px-3 py-2">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-2 flex justify-end">
            <select
              value={country}
              disabled={isSaving}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-[#c2d0dd] disabled:opacity-50"
            >
              <optgroup label="Preferred" className="bg-[#14181c]">
                {WATCH_PROVIDER_PRIORITY_COUNTRIES.map((code) => (
                  <option key={code} value={code} className="bg-[#14181c]">
                    {getCountryDisplayName(code)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="All countries" className="bg-[#14181c]">
                {OTHER_COUNTRIES.map((code) => (
                  <option key={code} value={code} className="bg-[#14181c]">
                    {getCountryDisplayName(code)}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <p className="mt-2 text-xs text-[#678]">
            Streaming data provided by{' '}
            <a
              href="https://www.justwatch.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#9ab0bf]"
            >
              JustWatch
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
