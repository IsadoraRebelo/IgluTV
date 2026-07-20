import { Suspense } from 'react';

import { SearchResultsSection } from '@/components/SearchResults/SearchResultsSection';

import {
  HomeSearchBar,
  SearchFilters,
  SearchResultsSkeleton,
} from '@/components';

import type { SearchType } from '@/services/search';

const VALID_TYPES: SearchType[] = ['all', 'shows', 'anime', 'cast'];

function parseType(value: string | undefined): SearchType {
  return VALID_TYPES.includes(value as SearchType)
    ? (value as SearchType)
    : 'all';
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type: typeParam } = await searchParams;
  const query = (q ?? '').trim();
  const type = parseType(typeParam);

  return (
    <div className="flex flex-1 flex-col">
      <main className="container-shell flex-1 pb-5">
        <div className="mt-5 lg:hidden">
          <HomeSearchBar
            key={query}
            containerClassName=""
            initialQuery={query}
          />
        </div>

        <h1 className="mt-5 hidden text-xl font-semibold tracking-tight text-white md:mt-10 lg:block">
          {query ? `Showing results for "${query}"` : 'Search'}
        </h1>

        {query ? (
          <>
            <div className="mt-2">
              <SearchFilters query={query} active={type} variant="mobile" />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-5 md:mt-6 md:gap-10 lg:grid-cols-[1fr_260px]">
              <div>
                <Suspense
                  key={`${query}|${type}`}
                  fallback={<SearchResultsSkeleton />}
                >
                  <SearchResultsSection query={query} type={type} />
                </Suspense>
              </div>

              <SearchFilters query={query} active={type} variant="desktop" />
            </div>
          </>
        ) : (
          <p className="text-text-faint mt-6 text-sm">
            Search for a show or a cast member.
          </p>
        )}
      </main>
    </div>
  );
}
