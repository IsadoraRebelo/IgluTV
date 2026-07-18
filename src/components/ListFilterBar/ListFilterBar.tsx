'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Grid3x3, LayoutGrid, SlidersHorizontal, X } from 'lucide-react';

import {
  FilterDropdown,
  MobileFilterSection,
  SortDropdown,
} from '@/components/FilterDropdown/FilterDropdown';

import type { Density, FacetState, SortDirection } from '@/types/list-controls';

import { cn } from '@/utils';

function MobileFiltersSheet<TSortKey extends string>({
  facets,
  sortKey,
  sortDirection,
  sortLabels,
  onSortChange,
}: {
  facets: FacetState[];
  sortKey: TSortKey;
  sortDirection: SortDirection;
  sortLabels: Record<TSortKey, string>;
  onSortChange: (key: TSortKey) => void;
}) {
  const activeFilterCount = facets.reduce(
    (sum, facet) => sum + facet.selected.size,
    0
  );
  const sortKeys = Object.keys(sortLabels) as TSortKey[];

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
          <div className="relative flex shrink-0 items-center justify-center px-4 py-3 pt-5">
            <DialogPrimitive.Title className="text-muted-foreground text-center text-xs font-semibold uppercase">
              Filters
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute top-1 right-2 flex h-8 w-8 items-center justify-center text-white"
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
                {sortKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSortChange(key)}
                    className={cn(
                      'flex items-center justify-between rounded-md px-1 py-1 text-left text-sm',
                      key === sortKey ? 'text-white' : 'text-[#c2d0dd]'
                    )}
                  >
                    {sortLabels[key]}
                    {key === sortKey ? (
                      <span className="text-accent">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            {facets.map((facet, i) => (
              <MobileFilterSection
                key={facet.key}
                label={facet.label}
                options={facet.options}
                optionLabel={facet.optionLabel}
                selected={facet.selected}
                onToggle={facet.onToggle}
                showBorder={i < facets.length - 1}
              />
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type ListFilterBarSectionProps<TSortKey extends string> = {
  layout?: 'section';
  title: string;
  facets: FacetState[];
  sortKey: TSortKey;
  sortDirection: SortDirection;
  sortLabels: Record<TSortKey, string>;
  onSortChange: (key: TSortKey) => void;
  density?: Density | null;
  onDensityChange?: (density: Density) => void;
  controlsRowClassName?: string;
  desktopFacetsClassName?: string;
  sortDropdownWrapperClassName?: string;
};

type ListFilterBarCompactProps<TSortKey extends string> = {
  layout: 'compact';
  facets: FacetState[];
  sortKey: TSortKey;
  sortDirection: SortDirection;
  sortLabels: Record<TSortKey, string>;
  onSortChange: (key: TSortKey) => void;
};

export function ListFilterBar<TSortKey extends string>(
  props:
    ListFilterBarSectionProps<TSortKey> | ListFilterBarCompactProps<TSortKey>
) {
  if (props.layout === 'compact') {
    const { facets, sortKey, sortDirection, sortLabels, onSortChange } = props;
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-2">
        <div className="flex flex-wrap items-center gap-3">
          {facets.map((facet) => (
            <FilterDropdown
              key={facet.key}
              label={facet.label}
              options={facet.options}
              optionLabel={facet.optionLabel}
              selected={facet.selected}
              onToggle={facet.onToggle}
            />
          ))}
        </div>

        <SortDropdown
          sortKey={sortKey}
          sortDirection={sortDirection}
          labels={sortLabels}
          onSortChange={onSortChange}
        />
      </div>
    );
  }

  const {
    title,
    facets,
    sortKey,
    sortDirection,
    sortLabels,
    onSortChange,
    density,
    onDensityChange,
    controlsRowClassName = 'flex flex-wrap items-center gap-3',
    desktopFacetsClassName = 'hidden flex-wrap items-center gap-3 sm:flex',
    sortDropdownWrapperClassName = 'hidden sm:block ml-3',
  } = props;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-1">
      <h2 className="text-muted-foreground text-sm font-semibold tracking-widest uppercase">
        {title}
      </h2>

      <div className={controlsRowClassName}>
        <div className={desktopFacetsClassName}>
          {facets.map((facet) => (
            <FilterDropdown
              key={facet.key}
              label={facet.label}
              options={facet.options}
              optionLabel={facet.optionLabel}
              selected={facet.selected}
              onToggle={facet.onToggle}
            />
          ))}
        </div>

        <div className="sm:hidden">
          <MobileFiltersSheet
            facets={facets}
            sortKey={sortKey}
            sortDirection={sortDirection}
            sortLabels={sortLabels}
            onSortChange={onSortChange}
          />
        </div>

        <div className={sortDropdownWrapperClassName}>
          <SortDropdown
            sortKey={sortKey}
            sortDirection={sortDirection}
            labels={sortLabels}
            onSortChange={onSortChange}
          />
        </div>

        {density && onDensityChange ? (
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
        ) : null}
      </div>
    </div>
  );
}
