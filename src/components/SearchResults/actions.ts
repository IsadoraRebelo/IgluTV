'use server';

import {
  loadMoreSearchResults,
  type SearchCursor,
  type SearchPageResult,
  type SearchType,
} from '@/services/search';

export async function loadMoreSearchResultsAction(
  query: string,
  type: SearchType,
  cursor: SearchCursor
): Promise<SearchPageResult> {
  return loadMoreSearchResults(query, type, cursor);
}
