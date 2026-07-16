'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown } from 'lucide-react';

import { FilterDropdown } from '@/components/FilterDropdown/FilterDropdown';

import { cn } from '@/utils';

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
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div className="flex flex-wrap items-center gap-5">
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

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-semibold tracking-wide text-[#9ab0bf] uppercase"
          >
            Sort by {SORT_LABELS[sortKey]}
            {sortDirection === 'asc' ? '↑' : '↓'}
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out bg-muted z-50 w-48 rounded-lg p-2 shadow-2xl ring-1 ring-white/10"
          >
            {(Object.keys(SORT_LABELS) as CastSortKey[]).map((key) => (
              <DropdownMenu.Item
                key={key}
                onSelect={() => onSortChange(key)}
                className={cn(
                  'rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-white/5',
                  key === sortKey ? 'text-white' : 'text-[#c2d0dd]'
                )}
              >
                {SORT_LABELS[key]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
