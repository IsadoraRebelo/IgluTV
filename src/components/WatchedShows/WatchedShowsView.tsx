'use client';

import { useMemo, useState } from 'react';

import { Pagination } from '@/components/Pagination/Pagination';
import { PosterCard } from '@/components/PosterCard/PosterCard';
import type { DisplayStatus } from '@/types';
import { cn } from '@/utils';

import type {
  Density,
  SortDirection,
  SortKey,
  WatchedShowEntry,
} from './types';
import { WatchedShowsFilterBar } from './WatchedShowsFilterBar';

const STATUS_OPTIONS: { id: DisplayStatus; label: string }[] = [
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'caught-up', label: 'Caught Up' },
  { id: 'paused', label: 'Paused' },
  { id: 'dropped', label: 'Dropped' },
  { id: 'finished', label: 'Finished' },
];

const PAGE_SIZE: Record<Density, number> = {
  dense: 66,
  large: 36,
};

const SORT_DEFAULT_DIRECTION: Record<SortKey, SortDirection> = {
  'release-date': 'desc',
  alphabetical: 'asc',
  'date-added': 'desc',
  progress: 'desc',
};

const DENSITY_GRID_CLASSES: Record<Density, string> = {
  dense:
    'grid-cols-[repeat(3,minmax(0,1fr))] sm:grid-cols-[repeat(4,minmax(0,1fr))] md:grid-cols-[repeat(6,minmax(0,1fr))] lg:grid-cols-[repeat(8,minmax(0,1fr))] xl:grid-cols-[repeat(11,minmax(0,1fr))]',
  large:
    'grid-cols-[repeat(2,minmax(0,1fr))] sm:grid-cols-[repeat(3,minmax(0,1fr))] md:grid-cols-[repeat(4,minmax(0,1fr))] lg:grid-cols-[repeat(6,minmax(0,1fr))]',
};

// Matches each density's actual rendered column width (within the max-w-6xl
// container) at each breakpoint — an undersized `sizes` hint here makes
// next/image serve a smaller cached variant than the card actually renders
// at, which looks soft/blurry once CSS scales it back up.
const DENSITY_IMAGE_SIZES: Record<Density, string> = {
  dense:
    '(max-width: 640px) 30vw, (max-width: 768px) 23vw, (max-width: 1024px) 16vw, (max-width: 1280px) 12vw, 10vw',
  large:
    '(max-width: 640px) 47vw, (max-width: 768px) 31vw, (max-width: 1024px) 23vw, 16vw',
};

function progressRatio(entry: WatchedShowEntry): number {
  return entry.show.markableEpisodeCount > 0
    ? entry.watchedCount / entry.show.markableEpisodeCount
    : 0;
}

function sortEntries(
  entries: WatchedShowEntry[],
  sortKey: SortKey,
  direction: SortDirection
): WatchedShowEntry[] {
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
      case 'progress':
        return progressRatio(a) - progressRatio(b);
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

export function WatchedShowsView({ entries }: { entries: WatchedShowEntry[] }) {
  const [selectedStatuses, setSelectedStatuses] = useState<Set<DisplayStatus>>(
    new Set()
  );
  const [selectedDecades, setSelectedDecades] = useState<Set<number>>(new Set());
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    new Set()
  );
  const [sortKey, setSortKey] = useState<SortKey>('release-date');
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    SORT_DEFAULT_DIRECTION['release-date']
  );
  const [density, setDensity] = useState<Density>('dense');
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
      if (selectedStatuses.size > 0 && !selectedStatuses.has(entry.displayStatus)) {
        return false;
      }
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
  }, [entries, selectedStatuses, selectedDecades, selectedGenres, selectedServices]);

  const sortedEntries = useMemo(
    () => sortEntries(filteredEntries, sortKey, sortDirection),
    [filteredEntries, sortKey, sortDirection]
  );

  const pageSize = PAGE_SIZE[density];
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageEntries = sortedEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function resetToFirstPage() {
    setPage(1);
  }

  function handleSortChange(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(SORT_DEFAULT_DIRECTION[key]);
    }
    resetToFirstPage();
  }

  function handleDensityChange(next: Density) {
    setDensity(next);
    resetToFirstPage();
  }

  if (entries.length === 0) {
    return (
      <p className="py-24 text-center text-[#9ab0bf]">
        No shows watched yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Shows
      </h1>

      <WatchedShowsFilterBar
        statusOptions={STATUS_OPTIONS}
        decadeOptions={decadeOptions}
        genreOptions={genreOptions}
        serviceOptions={serviceOptions}
        selectedStatuses={selectedStatuses}
        selectedDecades={selectedDecades}
        selectedGenres={selectedGenres}
        selectedServices={selectedServices}
        onToggleStatus={(value) => {
          setSelectedStatuses((s) => toggleSetValue(s, value));
          resetToFirstPage();
        }}
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
        density={density}
        onDensityChange={handleDensityChange}
      />

      {pageEntries.length === 0 ? (
        <p className="py-24 text-center text-[#9ab0bf]">
          No shows match these filters.
        </p>
      ) : (
        <div className={cn('grid gap-3', DENSITY_GRID_CLASSES[density])}>
          {pageEntries.map((entry) => (
            <PosterCard
              key={entry.show.id}
              show={entry.show}
              className="w-full"
              sizes={DENSITY_IMAGE_SIZES[density]}
              progress={{
                watchedCount: entry.watchedCount,
                showStatus: entry.status,
              }}
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
