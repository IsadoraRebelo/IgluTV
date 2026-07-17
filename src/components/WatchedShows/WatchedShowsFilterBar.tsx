'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Grid3x3, LayoutGrid, SlidersHorizontal, X } from 'lucide-react';

import {
  FilterDropdown,
  MobileFilterSection,
  SortDropdown,
} from '@/components/FilterDropdown/FilterDropdown';
import type { DisplayStatus } from '@/types';
import { cn } from '@/utils';

import type { Density, SortDirection, SortKey } from './types';

const SORT_LABELS: Record<SortKey, string> = {
  'release-date': 'Release Date',
  alphabetical: 'Alphabetical',
  'date-added': 'Date Added',
  progress: 'Progress',
};

function MobileFiltersSheet({
  statusOptions,
  decadeOptions,
  genreOptions,
  serviceOptions,
  selectedStatuses,
  selectedDecades,
  selectedGenres,
  selectedServices,
  onToggleStatus,
  onToggleDecade,
  onToggleGenre,
  onToggleService,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  statusOptions: { id: DisplayStatus; label: string }[];
  decadeOptions: number[];
  genreOptions: string[];
  serviceOptions: string[];
  selectedStatuses: Set<DisplayStatus>;
  selectedDecades: Set<number>;
  selectedGenres: Set<string>;
  selectedServices: Set<string>;
  onToggleStatus: (value: DisplayStatus) => void;
  onToggleDecade: (value: number) => void;
  onToggleGenre: (value: string) => void;
  onToggleService: (value: string) => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortChange: (key: SortKey) => void;
}) {
  const activeFilterCount =
    selectedStatuses.size +
    selectedDecades.size +
    selectedGenres.size +
    selectedServices.size;

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
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
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
              label="Status"
              options={statusOptions.map((s) => s.id)}
              optionLabel={(id) =>
                statusOptions.find((s) => s.id === id)?.label ?? id
              }
              selected={selectedStatuses}
              onToggle={onToggleStatus}
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

export function WatchedShowsFilterBar({
  title,
  statusOptions,
  decadeOptions,
  genreOptions,
  serviceOptions,
  selectedStatuses,
  selectedDecades,
  selectedGenres,
  selectedServices,
  onToggleStatus,
  onToggleDecade,
  onToggleGenre,
  onToggleService,
  sortKey,
  sortDirection,
  onSortChange,
  density,
  onDensityChange,
}: {
  title: string;
  statusOptions: { id: DisplayStatus; label: string }[];
  decadeOptions: number[];
  genreOptions: string[];
  serviceOptions: string[];
  selectedStatuses: Set<DisplayStatus>;
  selectedDecades: Set<number>;
  selectedGenres: Set<string>;
  selectedServices: Set<string>;
  onToggleStatus: (value: DisplayStatus) => void;
  onToggleDecade: (value: number) => void;
  onToggleGenre: (value: string) => void;
  onToggleService: (value: string) => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortChange: (key: SortKey) => void;
  density: Density;
  onDensityChange: (density: Density) => void;
}) {
  const statusLabelById = new Map(statusOptions.map((s) => [s.id, s.label]));

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-1 mt-5">
      <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>

      <div className="flex flex-wrap items-center gap-3">
        <div className="hidden flex-wrap items-center gap-3 sm:flex">
          <FilterDropdown
            label="Status"
            options={statusOptions.map((s) => s.id)}
            optionLabel={(id) => statusLabelById.get(id) ?? id}
            selected={selectedStatuses}
            onToggle={onToggleStatus}
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
            statusOptions={statusOptions}
            decadeOptions={decadeOptions}
            genreOptions={genreOptions}
            serviceOptions={serviceOptions}
            selectedStatuses={selectedStatuses}
            selectedDecades={selectedDecades}
            selectedGenres={selectedGenres}
            selectedServices={selectedServices}
            onToggleStatus={onToggleStatus}
            onToggleDecade={onToggleDecade}
            onToggleGenre={onToggleGenre}
            onToggleService={onToggleService}
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

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Dense grid"
            onClick={() => onDensityChange('dense')}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md',
              density === 'dense'
                ? 'bg-white/10 text-white'
                : 'text-[#678] hover:text-[#9ab0bf]'
            )}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Large grid"
            onClick={() => onDensityChange('large')}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md',
              density === 'large'
                ? 'bg-white/10 text-white'
                : 'text-[#678] hover:text-[#9ab0bf]'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
