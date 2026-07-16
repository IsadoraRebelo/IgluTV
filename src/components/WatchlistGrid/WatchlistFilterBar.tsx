'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';

import {
  FilterDropdown,
  MobileFilterSection,
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
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function WatchlistFilterBar({
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
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div className="hidden flex-wrap items-center gap-5 sm:flex">
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

      <div className="hidden sm:block">
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
              className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out z-50 w-48 rounded-lg bg-muted p-2 shadow-2xl ring-1 ring-white/10"
            >
              {(Object.keys(SORT_LABELS) as WatchlistSortKey[]).map((key) => (
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
    </div>
  );
}
