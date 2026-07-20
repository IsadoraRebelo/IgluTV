'use client';

import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ListFilterBar } from '@/components/ListFilterBar/ListFilterBar';
import { Pagination } from '@/components/Pagination/Pagination';
import { PosterCard } from '@/components/PosterCard/PosterCard';
import { PosterGrid } from '@/components/PosterGrid/PosterGrid';

import type { DisplayStatus, ShowStatus, ShowSummary } from '@/types';
import type { Density, FacetDef, SortKeyDef } from '@/types/list-controls';

import { cn } from '@/utils';
import { useListControls } from '@/hooks/useListControls';

export type WatchedShowEntry = {
  show: ShowSummary;
  watchedCount: number;
  status: ShowStatus;
  displayStatus: DisplayStatus;
  decade: number | null;
  createdAt: string;
};

type WatchedShowSortKey =
  'release-date' | 'alphabetical' | 'date-added' | 'progress';

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

const FACETS: FacetDef<WatchedShowEntry>[] = [
  {
    key: 'status',
    label: 'Status',
    getOptions: () => STATUS_OPTIONS.map((s) => s.id),
    getValues: (entry) => [entry.displayStatus],
    optionLabel: (value) =>
      STATUS_OPTIONS.find((s) => s.id === value)?.label ?? String(value),
    width: 140,
  },
  {
    key: 'decade',
    label: 'Decade',
    getOptions: (entries) =>
      Array.from(
        new Set(
          entries.map((e) => e.decade).filter((d): d is number => d !== null)
        )
      ).sort((a, b) => b - a),
    getValues: (entry) => (entry.decade === null ? [] : [entry.decade]),
    optionLabel: (value) => `${value}s`,
    width: 110,
  },
  {
    key: 'genre',
    label: 'Genre',
    getOptions: (entries) =>
      Array.from(new Set(entries.flatMap((e) => e.show.genres))).sort((a, b) =>
        a.localeCompare(b)
      ),
    getValues: (entry) => entry.show.genres,
    optionLabel: (value) => String(value),
    width: 200,
  },
  {
    key: 'service',
    label: 'Service',
    getOptions: (entries) =>
      Array.from(
        new Set(
          entries
            .map((e) => e.show.network)
            .filter((n): n is string => n !== null)
        )
      ).sort((a, b) => a.localeCompare(b)),
    getValues: (entry) =>
      entry.show.network === null ? [] : [entry.show.network],
    optionLabel: (value) => String(value),
    width: 150,
  },
];

const SORT_KEYS: SortKeyDef<WatchedShowEntry, WatchedShowSortKey>[] = [
  {
    key: 'release-date',
    label: 'Release Date',
    defaultDirection: 'desc',
    strategy: { kind: 'nullable-string', getValue: (e) => e.show.year },
  },
  {
    key: 'alphabetical',
    label: 'Alphabetical',
    defaultDirection: 'asc',
    strategy: {
      kind: 'comparator',
      compare: (a, b) => a.show.name.localeCompare(b.show.name),
    },
  },
  {
    key: 'date-added',
    label: 'Date Added',
    defaultDirection: 'desc',
    strategy: {
      kind: 'comparator',
      compare: (a, b) =>
        a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
    },
  },
  {
    key: 'progress',
    label: 'Progress',
    defaultDirection: 'desc',
    strategy: {
      kind: 'comparator',
      compare: (a, b) => progressRatio(a) - progressRatio(b),
    },
  },
];

export function WatchedShowsView({ entries }: { entries: WatchedShowEntry[] }) {
  const controls = useListControls<WatchedShowEntry, WatchedShowSortKey>({
    entries,
    facets: FACETS,
    sortKeys: SORT_KEYS,
    initialSortKey: 'release-date',
    pageSize: { initial: 'dense', pageSizeByDensity: PAGE_SIZE },
  });

  if (controls.isEmpty) {
    return <EmptyState message="No shows watched yet." />;
  }

  const density = controls.density ?? 'dense';

  return (
    <div className="flex flex-col gap-3 md:gap-5">
      <ListFilterBar
        title="Shows"
        facets={controls.facets}
        sortKey={controls.sortKey}
        sortDirection={controls.sortDirection}
        sortLabels={controls.sortLabels}
        onSortChange={controls.onSortChange}
        density={density}
        onDensityChange={controls.onDensityChange}
      />

      {controls.hasNoMatches ? (
        <EmptyState message="No shows match these filters." />
      ) : (
        <PosterGrid className={cn('gap-3', DENSITY_GRID_CLASSES[density])}>
          {controls.pageEntries.map((entry) => (
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
        </PosterGrid>
      )}

      <Pagination
        page={controls.page}
        totalPages={controls.totalPages}
        onPageChange={controls.onPageChange}
      />
    </div>
  );
}
