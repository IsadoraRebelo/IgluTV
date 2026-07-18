'use client';

import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ListFilterBar } from '@/components/ListFilterBar/ListFilterBar';
import { PosterGrid } from '@/components/PosterGrid/PosterGrid';

import { TMDB_TV_GENRES } from '@/consts';

import type { PersonCastCredit } from '@/types';
import type { FacetDef, SortKeyDef } from '@/types/list-controls';

import { useListControls } from '@/hooks/useListControls';

import { CastCreditCard } from './CastCreditCard';

type CastSortKey = 'popularity' | 'release-date' | 'alphabetical';

function decadeOf(credit: PersonCastCredit): number | null {
  return credit.year ? Math.floor(Number(credit.year) / 10) * 10 : null;
}

function genreNamesOf(credit: PersonCastCredit): string[] {
  return credit.genreIds
    .map((id) => TMDB_TV_GENRES[id])
    .filter((name): name is string => name !== undefined);
}

const FACETS: FacetDef<PersonCastCredit>[] = [
  {
    key: 'decade',
    label: 'Decade',
    getOptions: (entries) =>
      Array.from(
        new Set(entries.map(decadeOf).filter((d): d is number => d !== null))
      ).sort((a, b) => b - a),
    getValues: (entry) => {
      const decade = decadeOf(entry);
      return decade === null ? [] : [decade];
    },
    optionLabel: (value) => `${value}s`,
  },
  {
    key: 'genre',
    label: 'Genre',
    getOptions: (entries) =>
      Array.from(new Set(entries.flatMap(genreNamesOf))).sort((a, b) =>
        a.localeCompare(b)
      ),
    getValues: (entry) => genreNamesOf(entry),
    optionLabel: (value) => String(value),
  },
];

const SORT_KEYS: SortKeyDef<PersonCastCredit, CastSortKey>[] = [
  {
    key: 'popularity',
    label: 'Popularity',
    defaultDirection: 'desc',
    strategy: {
      kind: 'comparator',
      compare: (a, b) => a.popularity - b.popularity,
    },
  },
  {
    key: 'release-date',
    label: 'Release Date',
    defaultDirection: 'desc',
    strategy: { kind: 'nullable-string', getValue: (c) => c.firstAirDate },
  },
  {
    key: 'alphabetical',
    label: 'Alphabetical',
    defaultDirection: 'asc',
    strategy: {
      kind: 'comparator',
      compare: (a, b) => a.showName.localeCompare(b.showName),
    },
  },
];

export function CastPageView({
  credits,
  watchedCounts,
}: {
  credits: PersonCastCredit[];
  watchedCounts: Map<number, number> | null;
}) {
  const controls = useListControls<PersonCastCredit, CastSortKey>({
    entries: credits,
    facets: FACETS,
    sortKeys: SORT_KEYS,
    initialSortKey: 'popularity',
    pageSize: 'all',
  });

  if (controls.isEmpty) {
    return <EmptyState message="No TV shows found." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <ListFilterBar
        layout="compact"
        facets={controls.facets}
        sortKey={controls.sortKey}
        sortDirection={controls.sortDirection}
        sortLabels={controls.sortLabels}
        onSortChange={controls.onSortChange}
      />

      {controls.hasNoMatches ? (
        <EmptyState message="No TV shows match these filters." />
      ) : (
        <PosterGrid className="grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {controls.pageEntries.map((credit) => (
            <CastCreditCard
              key={credit.showId}
              credit={credit}
              watchedCount={
                watchedCounts ? (watchedCounts.get(credit.showId) ?? 0) : null
              }
            />
          ))}
        </PosterGrid>
      )}
    </div>
  );
}
