'use client';

import { useMemo, useState } from 'react';

import { TMDB_TV_GENRES } from '@/consts';

import type { PersonCastCredit } from '@/types';

import { CastCreditCard } from './CastCreditCard';
import { CastPageFilterBar } from './CastPageFilterBar';
import type { CastSortKey, SortDirection } from './types';

const SORT_DEFAULT_DIRECTION: Record<CastSortKey, SortDirection> = {
  popularity: 'desc',
  'release-date': 'desc',
  alphabetical: 'asc',
};

function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function decadeOf(credit: PersonCastCredit): number | null {
  return credit.year ? Math.floor(Number(credit.year) / 10) * 10 : null;
}

function genreNamesOf(credit: PersonCastCredit): string[] {
  return credit.genreIds
    .map((id) => TMDB_TV_GENRES[id])
    .filter((name): name is string => name !== undefined);
}

function sortCredits(
  credits: PersonCastCredit[],
  sortKey: CastSortKey,
  direction: SortDirection
): PersonCastCredit[] {
  if (sortKey === 'release-date') {
    const withDate = credits.filter((c) => c.firstAirDate !== null);
    const withoutDate = credits.filter((c) => c.firstAirDate === null);
    withDate.sort((a, b) => a.firstAirDate!.localeCompare(b.firstAirDate!));
    if (direction === 'desc') withDate.reverse();
    return [...withDate, ...withoutDate];
  }

  const sorted = [...credits].sort((a, b) => {
    switch (sortKey) {
      case 'popularity':
        return a.popularity - b.popularity;
      case 'alphabetical':
        return a.showName.localeCompare(b.showName);
    }
  });

  if (direction === 'desc') sorted.reverse();
  return sorted;
}

export function CastPageView({
  credits,
  watchedCounts,
}: {
  credits: PersonCastCredit[];
  watchedCounts: Map<number, number> | null;
}) {
  const [selectedDecades, setSelectedDecades] = useState<Set<number>>(
    new Set()
  );
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<CastSortKey>('popularity');
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    SORT_DEFAULT_DIRECTION.popularity
  );

  const decadeOptions = useMemo(
    () =>
      Array.from(
        new Set(credits.map(decadeOf).filter((d): d is number => d !== null))
      ).sort((a, b) => b - a),
    [credits]
  );

  const genreOptions = useMemo(
    () =>
      Array.from(new Set(credits.flatMap(genreNamesOf))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [credits]
  );

  const filteredCredits = useMemo(() => {
    return credits.filter((credit) => {
      const decade = decadeOf(credit);
      if (
        selectedDecades.size > 0 &&
        (decade === null || !selectedDecades.has(decade))
      ) {
        return false;
      }
      if (selectedGenres.size > 0) {
        const genreNames = genreNamesOf(credit);
        if (!genreNames.some((name) => selectedGenres.has(name))) {
          return false;
        }
      }
      return true;
    });
  }, [credits, selectedDecades, selectedGenres]);

  const sortedCredits = useMemo(
    () => sortCredits(filteredCredits, sortKey, sortDirection),
    [filteredCredits, sortKey, sortDirection]
  );

  function handleSortChange(key: CastSortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(SORT_DEFAULT_DIRECTION[key]);
    }
  }

  if (credits.length === 0) {
    return <p className="text-sm text-[#678]">No TV shows found.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <CastPageFilterBar
        decadeOptions={decadeOptions}
        genreOptions={genreOptions}
        selectedDecades={selectedDecades}
        selectedGenres={selectedGenres}
        onToggleDecade={(value) =>
          setSelectedDecades((s) => toggleSetValue(s, value))
        }
        onToggleGenre={(value) =>
          setSelectedGenres((s) => toggleSetValue(s, value))
        }
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      {sortedCredits.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#678]">
          No TV shows match these filters.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {sortedCredits.map((credit) => (
            <CastCreditCard
              key={credit.showId}
              credit={credit}
              watchedCount={
                watchedCounts ? (watchedCounts.get(credit.showId) ?? 0) : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
