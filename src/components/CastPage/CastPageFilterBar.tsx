'use client';

import {
  FilterDropdown,
  SortDropdown,
} from '@/components/FilterDropdown/FilterDropdown';

import type { CastSortKey, SortDirection } from './types';

const SORT_LABELS: Record<CastSortKey, string> = {
  popularity: 'Popularity',
  'release-date': 'Release Date',
  alphabetical: 'Alphabetical',
};

export function CastPageFilterBar({
  decadeOptions,
  genreOptions,
  selectedDecades,
  selectedGenres,
  onToggleDecade,
  onToggleGenre,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  decadeOptions: number[];
  genreOptions: string[];
  selectedDecades: Set<number>;
  selectedGenres: Set<string>;
  onToggleDecade: (value: number) => void;
  onToggleGenre: (value: string) => void;
  sortKey: CastSortKey;
  sortDirection: SortDirection;
  onSortChange: (key: CastSortKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-2">
      <div className="flex flex-wrap items-center gap-3">
        <FilterDropdown
          label="Decade"
          options={decadeOptions}
          optionLabel={(decade) => `${decade}s`}
          selected={selectedDecades}
          onToggle={onToggleDecade}
        />
        <FilterDropdown
          label="Genre"
          options={genreOptions}
          optionLabel={(genre) => genre}
          selected={selectedGenres}
          onToggle={onToggleGenre}
        />
      </div>

      <SortDropdown
        sortKey={sortKey}
        sortDirection={sortDirection}
        labels={SORT_LABELS}
        onSortChange={onSortChange}
      />
    </div>
  );
}
