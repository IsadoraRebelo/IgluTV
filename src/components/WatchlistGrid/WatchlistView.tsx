'use client';


import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ListFilterBar } from '@/components/ListFilterBar/ListFilterBar';
import { Pagination } from '@/components/Pagination/Pagination';
import { PosterCard } from '@/components/PosterCard/PosterCard';
import { PosterGrid } from '@/components/PosterGrid/PosterGrid';

import type { CatalogueShow } from '@/types';
import type { FacetDef, SortKeyDef } from '@/types/list-controls';

import { useListControls } from '@/hooks/useListControls';

export type WatchlistEntry = {
  show: CatalogueShow;
  decade: number | null;
  createdAt: string;
};

type WatchlistSortKey = 'release-date' | 'alphabetical' | 'date-added';

const PAGE_SIZE = 36;

// Always the larger card size — this page has no density toggle, unlike
// the Shows page.
const GRID_CLASSES =
  'grid-cols-[repeat(3,minmax(0,1fr))] md:grid-cols-[repeat(4,minmax(0,1fr))] lg:grid-cols-[repeat(6,minmax(0,1fr))] gap-3';
const IMAGE_SIZES = '(max-width: 768px) 31vw, (max-width: 1024px) 23vw, 16vw';

const FACETS: FacetDef<WatchlistEntry>[] = [
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
];

const SORT_KEYS: SortKeyDef<WatchlistEntry, WatchlistSortKey>[] = [
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
];

export function WatchlistView({ entries }: { entries: WatchlistEntry[] }) {
  const controls = useListControls<WatchlistEntry, WatchlistSortKey>({
    entries,
    facets: FACETS,
    sortKeys: SORT_KEYS,
    initialSortKey: 'release-date',
    pageSize: PAGE_SIZE,
  });

  if (controls.isEmpty) {
    return <EmptyState message="Watchlist is empty." />;
  }

  return (
    <div className="flex flex-col gap-3 md:gap-5">
      <ListFilterBar
        title="Watchlist"
        facets={controls.facets}
        sortKey={controls.sortKey}
        sortDirection={controls.sortDirection}
        sortLabels={controls.sortLabels}
        onSortChange={controls.onSortChange}
      />

      {controls.hasNoMatches ? (
        <EmptyState message="No shows match these filters." />
      ) : (
        <PosterGrid className={GRID_CLASSES}>
          {controls.pageEntries.map((entry) => (
            <PosterCard
              key={entry.show.id}
              show={entry.show}
              className="w-full"
              sizes={IMAGE_SIZES}
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
