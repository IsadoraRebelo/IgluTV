'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { SlidersHorizontal, X } from 'lucide-react';

import {
  FilterDropdown,
  MobileFilterSection,
  SortDropdown,
} from '@/components/FilterDropdown/FilterDropdown';
import { cn } from '@/utils';

import type { SortDirection, WatchlistSortKey } from './types';

const SORT_LABELS: Record<WatchlistSortKey, string> = {
  'release-date': 'Release Date',
  alphabetical: 'Alphabetical',
  'date-added': 'Date Added',
};

function MobileFiltersSheet({
  decadeOptions,
  genreOptions,
  serviceOptions,
  selectedDecades,
  selectedGenres,
  selectedServices,
  onToggleDecade,
  onToggleGenre,
  onToggleService,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  decadeOptions: number[];
  genreOptions: string[];
  serviceOptions: string[];
  selectedDecades: Set<number>;
  selectedGenres: Set<string>;
  selectedServices: Set<string>;
  onToggleDecade: (value: number) => void;
  onToggleGenre: (value: string) => void;
  onToggleService: (value: string) => void;
  sortKey: WatchlistSortKey;
  sortDirection: SortDirection;
  onSortChange: (key: WatchlistSortKey) => void;
}) {
  const activeFilterCount =
    selectedDecades.size + selectedGenres.size + selectedServices.size;

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
            <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
          ) : null}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out fixed inset-0 z-50 bg-black/70" />
        <DialogPrimitive.Content className="data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col rounded-t-lg bg-[#14181c] shadow-2xl">
          <div className="relative flex shrink-0 items-center justify-center px-4 py-3 pt-5">
            <DialogPrimitive.Title className="text-center text-xs font-semibold uppercase  text-muted-foreground">
              Filters
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute right-2 top-1 flex h-8 w-8 items-center justify-center text-white"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <div className="border-b border-white/10 py-3">
              <h3 className="px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Sort by
              </h3>
              <div className="flex flex-col">
                {(Object.keys(SORT_LABELS) as WatchlistSortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSortChange(key)}
                    className={cn(
                      'flex items-center justify-between rounded-md px-1 py-1 text-left text-sm',
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
            <MobileFilterSection
              label="Service"
              options={serviceOptions}
              optionLabel={(service) => service}
              selected={selectedServices}
              onToggle={onToggleService}
              showBorder={false}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function WatchlistFilterBar({
  title,
  decadeOptions,
  genreOptions,
  serviceOptions,
  selectedDecades,
  selectedGenres,
  selectedServices,
  onToggleDecade,
  onToggleGenre,
  onToggleService,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  title: string;
  decadeOptions: number[];
  genreOptions: string[];
  serviceOptions: string[];
  selectedDecades: Set<number>;
  selectedGenres: Set<string>;
  selectedServices: Set<string>;
  onToggleDecade: (value: number) => void;
  onToggleGenre: (value: string) => void;
  onToggleService: (value: string) => void;
  sortKey: WatchlistSortKey;
  sortDirection: SortDirection;
  onSortChange: (key: WatchlistSortKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-1 mt-5">
      <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>

      <div className="flex flex-wrap items-center gap-3">
        <div className="hidden flex-wrap items-center gap-3 sm:flex">
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
          <FilterDropdown
            label="Service"
            options={serviceOptions}
            optionLabel={(service) => service}
            selected={selectedServices}
            onToggle={onToggleService}
          />
        </div>

        <div className="sm:hidden">
          <MobileFiltersSheet
            decadeOptions={decadeOptions}
            genreOptions={genreOptions}
            serviceOptions={serviceOptions}
            selectedDecades={selectedDecades}
            selectedGenres={selectedGenres}
            selectedServices={selectedServices}
            onToggleDecade={onToggleDecade}
            onToggleGenre={onToggleGenre}
            onToggleService={onToggleService}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
          />
        </div>

        <div className="hidden sm:block ml-3">
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
