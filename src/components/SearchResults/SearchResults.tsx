'use client';

import { useState, useTransition } from 'react';

import type { SearchCursor, SearchType } from '@/services/search';

import type { PersonSearchResult, TvShowSearchResult } from '@/types';

import { loadMoreSearchResultsAction } from './actions';
import { PersonResultRow, ShowResultRow } from './SearchResultRow';

export function SearchResults({
  query,
  type,
  initialShows,
  initialPeople,
  initialHasMore,
  initialCursor,
}: {
  query: string;
  type: SearchType;
  initialShows: TvShowSearchResult[];
  initialPeople: PersonSearchResult[];
  initialHasMore: boolean;
  initialCursor: SearchCursor;
}) {
  const [shows, setShows] = useState(initialShows);
  const [people, setPeople] = useState(initialPeople);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const result = await loadMoreSearchResultsAction(query, type, cursor);

      // The service accumulates a full batch itself, so a defensive
      // ID check here only guards against TMDB occasionally repeating a
      // result at a raw-page boundary — not a page-skipping loop.
      setShows((prev) => {
        const seen = new Set(prev.map((show) => show.id));
        return [...prev, ...result.shows.filter((show) => !seen.has(show.id))];
      });
      setPeople((prev) => {
        const seen = new Set(prev.map((person) => person.id));
        return [
          ...prev,
          ...result.people.filter((person) => !seen.has(person.id)),
        ];
      });
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    });
  }

  if (shows.length === 0 && people.length === 0) {
    return (
      <p className="text-text-faint text-sm">
        No results for &quot;{query}&quot;
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {shows.map((show) => (
        <ShowResultRow key={show.id} show={show} />
      ))}

      {people.length > 0 ? (
        <>
          {type === 'all' && shows.length > 0 ? (
            <h2 className="mt-5 mb-2 px-2 text-lg font-semibold text-white">
              Cast
            </h2>
          ) : null}
          {people.map((person) => (
            <PersonResultRow key={person.id} person={person} />
          ))}
        </>
      ) : null}

      {hasMore ? (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={isPending}
          className="mt-5 self-center rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
        >
          {isPending ? 'Loading...' : 'Load more'}
        </button>
      ) : (
        <p className="text-text-faint mt-6 self-center text-sm">
          That&apos;s all the results
        </p>
      )}
    </div>
  );
}
