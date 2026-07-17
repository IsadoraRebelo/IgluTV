'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { SlidersHorizontal, X } from 'lucide-react';

import {
  FilterDropdown,
  MobileFilterSection,
  SortDropdown,
} from '@/components/FilterDropdown/FilterDropdown';

import { cn } from '@/utils';

import type { DiarySortDirection, DiarySortKey } from './types';

const SORT_LABELS: Record<DiarySortKey, string> = {
  'watched-date': 'Watched Date',
  'release-date': 'Release Date',
  alphabetical: 'Alphabetical',
};

function MobileFiltersSheet({
  yearOptions,
  decadeOptions,
  genreOptions,
  selectedYears,
  selectedDecades,
  selectedGenres,
  onToggleYear,
  onToggleDecade,
  onToggleGenre,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  yearOptions: number[];
  decadeOptions: number[];
  genreOptions: string[];
  selectedYears: Set<number>;
  selectedDecades: Set<number>;
  selectedGenres: Set<string>;
  onToggleYear: (value: number) => void;
  onToggleDecade: (value: number) => void;
  onToggleGenre: (value: string) => void;
  sortKey: DiarySortKey;
  sortDirection: DiarySortDirection;
  onSortChange: (key: DiarySortKey) => void;
}) {
  const activeFilterCount =
    selectedYears.size + selectedDecades.size + selectedGenres.size;

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Filters"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-[#9ab0bf]"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 ? (
            <span className="bg-accent absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full" />
          ) : null}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out fixed inset-0 z-50 bg-black/70" />
        <DialogPrimitive.Content className="data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col rounded-t-lg bg-[#14181c] shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <DialogPrimitive.Title className="text-sm font-semibold text-white">
              Filters
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <div className="border-b border-white/10 py-3">
              <h3 className="text-muted-foreground px-1 pb-2 text-xs font-semibold tracking-wide uppercase">
                Sort by
              </h3>
              <div className="flex flex-col">
                {(Object.keys(SORT_LABELS) as DiarySortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSortChange(key)}
                    className={cn(
                      'flex items-center justify-between rounded-md px-1 py-2.5 text-left text-sm',
                      key === sortKey ? 'text-white' : 'text-[#c2d0dd]'
                    )}
                  >
                    {SORT_LABELS[key]}
                    {key === sortKey ? (
                      <span className="text-accent">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <MobileFilterSection
              label="Diary Year"
              options={yearOptions}
              optionLabel={(year) => String(year)}
              selected={selectedYears}
              onToggle={onToggleYear}
            />
            <MobileFilterSection
              label="Decade"
              options={decadeOptions}
              optionLabel={(decade) => `${decade}s`}
              selected={selectedDecades}
              onToggle={onToggleDecade}
            />
            <MobileFilterSection
              label="Genre"
              options={genreOptions}
              optionLabel={(genre) => genre}
              selected={selectedGenres}
              onToggle={onToggleGenre}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function DiaryFilterBar({
  title,
  yearOptions,
  decadeOptions,
  genreOptions,
  selectedYears,
  selectedDecades,
  selectedGenres,
  onToggleYear,
  onToggleDecade,
  onToggleGenre,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  title: string;
  yearOptions: number[];
  decadeOptions: number[];
  genreOptions: string[];
  selectedYears: Set<number>;
  selectedDecades: Set<number>;
  selectedGenres: Set<string>;
  onToggleYear: (value: number) => void;
  onToggleDecade: (value: number) => void;
  onToggleGenre: (value: string) => void;
  sortKey: DiarySortKey;
  sortDirection: DiarySortDirection;
  onSortChange: (key: DiarySortKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-1 mt-5">
      <h2 className="text-muted-foreground text-sm font-semibold tracking-widest uppercase">
        {title}
      </h2>

      <div className="flex flex-wrap items-center gap-4">
        <div className="hidden flex-wrap items-center gap-5 sm:flex">
          <FilterDropdown
            label="Diary Year"
            options={yearOptions}
            optionLabel={(year) => String(year)}
            selected={selectedYears}
            onToggle={onToggleYear}
          />
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

        <div className="sm:hidden">
          <MobileFiltersSheet
            yearOptions={yearOptions}
            decadeOptions={decadeOptions}
            genreOptions={genreOptions}
            selectedYears={selectedYears}
            selectedDecades={selectedDecades}
            selectedGenres={selectedGenres}
            onToggleYear={onToggleYear}
            onToggleDecade={onToggleDecade}
            onToggleGenre={onToggleGenre}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
          />
        </div>

        <div className="hidden sm:block">
          <SortDropdown
            sortKey={sortKey}
            sortDirection={sortDirection}
            labels={SORT_LABELS}
            onSortChange={onSortChange}
          />
        </div>
      </div>
    </div>
  );
}
