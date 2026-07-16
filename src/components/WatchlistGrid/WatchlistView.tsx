'use client';

import { useMemo, useState } from 'react';

import { Pagination } from '@/components/Pagination/Pagination';
import { PosterCard } from '@/components/PosterCard/PosterCard';

import type { SortDirection, WatchlistEntry, WatchlistSortKey } from './types';
import { WatchlistFilterBar } from './WatchlistFilterBar';

const PAGE_SIZE = 36;

// Always the larger card size — this page has no density toggle, unlike
// the Shows page — so these match WatchedShowsView's `large` variant.
const GRID_CLASSES =
  'grid-cols-[repeat(2,minmax(0,1fr))] sm:grid-cols-[repeat(3,minmax(0,1fr))] md:grid-cols-[repeat(4,minmax(0,1fr))] lg:grid-cols-[repeat(6,minmax(0,1fr))]';
const IMAGE_SIZES =
  '(max-width: 640px) 47vw, (max-width: 768px) 31vw, (max-width: 1024px) 23vw, 16vw';

const SORT_DEFAULT_DIRECTION: Record<WatchlistSortKey, SortDirection> = {
  'release-date': 'desc',
  alphabetical: 'asc',
  'date-added': 'desc',
};

function sortEntries(
  entries: WatchlistEntry[],
  sortKey: WatchlistSortKey,
  direction: SortDirection
): WatchlistEntry[] {
  if (sortKey === 'release-date') {
    const withYear = entries.filter((e) => e.show.year !== null);
    const withoutYear = entries.filter((e) => e.show.year === null);
    withYear.sort((a, b) => a.show.year!.localeCompare(b.show.year!));
    if (direction === 'desc') withYear.reverse();
    return [...withYear, ...withoutYear];
  }

  const sorted = [...entries].sort((a, b) => {
    switch (sortKey) {
      case 'alphabetical':
        return a.show.name.localeCompare(b.show.name);
      case 'date-added':
        return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
    }
  });

  if (direction === 'desc') sorted.reverse();
  return sorted;
}

function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function WatchlistView({ entries }: { entries: WatchlistEntry[] }) {
  const [selectedDecades, setSelectedDecades] = useState<Set<number>>(new Set());
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    new Set()
  );
  const [sortKey, setSortKey] = useState<WatchlistSortKey>('release-date');
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    SORT_DEFAULT_DIRECTION['release-date']
  );
  const [page, setPage] = useState(1);

  const decadeOptions = useMemo(
    () =>
      Array.from(new Set(entries.map((e) => e.decade).filter((d): d is number => d !== null))).sort(
        (a, b) => b - a
      ),
    [entries]
  );
  const genreOptions = useMemo(
    () =>
      Array.from(new Set(entries.flatMap((e) => e.show.genres))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [entries]
  );
  const serviceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((e) => e.show.network)
            .filter((n): n is string => n !== null)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (
        selectedDecades.size > 0 &&
        (entry.decade === null || !selectedDecades.has(entry.decade))
      ) {
        return false;
      }
      if (
        selectedGenres.size > 0 &&
        !entry.show.genres.some((genre) => selectedGenres.has(genre))
      ) {
        return false;
      }
      if (
        selectedServices.size > 0 &&
        (entry.show.network === null || !selectedServices.has(entry.show.network))
      ) {
        return false;
      }
      return true;
    });
  }, [entries, selectedDecades, selectedGenres, selectedServices]);

  const sortedEntries = useMemo(
    () => sortEntries(filteredEntries, sortKey, sortDirection),
    [filteredEntries, sortKey, sortDirection]
  );

  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageEntries = sortedEntries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function resetToFirstPage() {
    setPage(1);
  }

  function handleSortChange(key: WatchlistSortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(SORT_DEFAULT_DIRECTION[key]);
    }
    resetToFirstPage();
  }

  if (entries.length === 0) {
    return (
      <p className="py-24 text-center text-[#9ab0bf]">
        Watchlist is empty.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Watchlist
      </h1>

      <WatchlistFilterBar
        decadeOptions={decadeOptions}
        genreOptions={genreOptions}
        serviceOptions={serviceOptions}
        selectedDecades={selectedDecades}
        selectedGenres={selectedGenres}
        selectedServices={selectedServices}
        onToggleDecade={(value) => {
          setSelectedDecades((s) => toggleSetValue(s, value));
          resetToFirstPage();
        }}
        onToggleGenre={(value) => {
          setSelectedGenres((s) => toggleSetValue(s, value));
          resetToFirstPage();
        }}
        onToggleService={(value) => {
          setSelectedServices((s) => toggleSetValue(s, value));
          resetToFirstPage();
        }}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      {pageEntries.length === 0 ? (
        <p className="py-24 text-center text-[#9ab0bf]">
          No shows match these filters.
        </p>
      ) : (
        <div className={`grid gap-3 ${GRID_CLASSES}`}>
          {pageEntries.map((entry) => (
            <PosterCard
              key={entry.show.id}
              show={entry.show}
              className="w-full"
              sizes={IMAGE_SIZES}
            />
          ))}
        </div>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
