import { SearchFilters, SearchResults } from '@/components';

import {
  loadMoreSearchResults,
  type SearchCursor,
  type SearchType,
} from '@/services/search';

const INITIAL_SEARCH_CURSOR: SearchCursor = { tmdbPage: 1, skip: 0 };

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

  const { shows, people, hasMore, nextCursor } = query
    ? await loadMoreSearchResults(query, type, INITIAL_SEARCH_CURSOR)
    : {
        shows: [],
        people: [],
        hasMore: false,
        nextCursor: INITIAL_SEARCH_CURSOR,
      };

  return (
    <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
      <main className="mx-auto w-full max-w-[950px] flex-1 px-3 pb-20 md:px-0">
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white md:mt-10">
          {query ? `Showing results for "${query}"` : 'Search'}
        </h1>

        {query ? (
          <>
            <div className="mt-4">
              <SearchFilters query={query} active={type} variant="mobile" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_260px]">
              <div>
                <SearchResults
                  key={`${query}|${type}`}
                  query={query}
                  type={type}
                  initialShows={shows}
                  initialPeople={people}
                  initialHasMore={hasMore}
                  initialCursor={nextCursor}
                />
              </div>

              <SearchFilters query={query} active={type} variant="desktop" />
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-[#678]">
            Search for a show or a cast member.
          </p>
        )}
      </main>
    </div>
  );
}
