import {
  loadMoreSearchResults,
  type SearchCursor,
  type SearchType,
} from '@/services/search';

import { SearchResults } from './SearchResults';

const INITIAL_SEARCH_CURSOR: SearchCursor = { tmdbPage: 1, skip: 0 };

export async function SearchResultsSection({
  query,
  type,
}: {
  query: string;
  type: SearchType;
}) {
  const { shows, people, hasMore, nextCursor } = await loadMoreSearchResults(
    query,
    type,
    INITIAL_SEARCH_CURSOR
  );

  return (
    <SearchResults
      key={`${query}|${type}`}
      query={query}
      type={type}
      initialShows={shows}
      initialPeople={people}
      initialHasMore={hasMore}
      initialCursor={nextCursor}
    />
  );
}
