'use client';

import * as HoverCard from '@radix-ui/react-hover-card';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/utils';

export function FilterDropdown<T extends string | number>({
  label,
  options,
  optionLabel,
  selected,
  onToggle,
}: {
  label: string;
  options: T[];
  optionLabel: (value: T) => string;
  selected: Set<T>;
  onToggle: (value: T) => void;
}) {
  if (options.length === 0) return null;

  const labelContent = (
    <>
      {label}
      {selected.size > 0 ? ` (${selected.size})` : ''}
      <ChevronDown className="h-3 w-3" />
    </>
  );

  return (
    <HoverCard.Root openDelay={100} closeDelay={150}>
      <div className="relative">
        {/* Reserves the closed-state footprint in the flex row so the absolutely
            positioned trigger below can grow open without reflowing siblings. */}
        <span
          aria-hidden="true"
          className="invisible flex items-center gap-1 text-xs font-semibold tracking-wide uppercase"
        >
          {labelContent}
        </span>
        <HoverCard.Trigger asChild>
          <button
            type="button"
            className={cn(
              'absolute top-0 left-0 flex items-center gap-1 text-xs font-semibold tracking-wide uppercase',
              'data-[state=open]:z-50 data-[state=open]:w-56 data-[state=open]:justify-start data-[state=open]:rounded-t-lg data-[state=open]:border data-[state=open]:border-b-0 data-[state=open]:border-white/10 data-[state=open]:bg-muted data-[state=open]:px-3 data-[state=open]:py-2 data-[state=open]:shadow-2xl',
              selected.size > 0 ? 'text-white' : 'text-[#9ab0bf]'
            )}
          >
            {labelContent}
          </button>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content
            side="bottom"
            align="start"
            sideOffset={0}
            className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out z-50 max-h-80 w-56 overflow-y-auto rounded-b-lg border border-white/10 bg-muted p-2 shadow-2xl"
          >
            {options.map((option) => {
              const isSelected = selected.has(option);
              return (
                <button
                  key={option}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={() => onToggle(option)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#c2d0dd] outline-none hover:bg-white/5"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-white/20">
                    {isSelected ? <Check className="h-3 w-3 text-accent" /> : null}
                  </span>
                  {optionLabel(option)}
                </button>
              );
            })}
          </HoverCard.Content>
        </HoverCard.Portal>
      </div>
    </HoverCard.Root>
  );
}

export function SortDropdown<K extends string>({
  sortKey,
  sortDirection,
  labels,
  onSortChange,
}: {
  sortKey: K;
  sortDirection: 'asc' | 'desc';
  labels: Record<K, string>;
  onSortChange: (key: K) => void;
}) {
  const keys = Object.keys(labels) as K[];

  return (
    <HoverCard.Root openDelay={100} closeDelay={150}>
      <HoverCard.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-semibold tracking-wide text-[#9ab0bf] uppercase"
        >
          Sort by {labels[sortKey]}
          {sortDirection === 'asc' ? '↑' : '↓'}
          <ChevronDown className="h-3 w-3" />
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out z-50 w-48 rounded-lg bg-muted p-2 shadow-2xl ring-1 ring-white/10"
        >
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onSortChange(key)}
              className={cn(
                'block w-full rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-white/5',
                key === sortKey ? 'text-white' : 'text-[#c2d0dd]'
              )}
            >
              {labels[key]}
            </button>
          ))}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

export function MobileFilterSection<T extends string | number>({
  label,
  options,
  optionLabel,
  selected,
  onToggle,
}: {
  label: string;
  options: T[];
  optionLabel: (value: T) => string;
  selected: Set<T>;
  onToggle: (value: T) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="border-b border-white/10 py-3">
      <h3 className="px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </h3>
      <div className="flex flex-col">
        {options.map((option) => {
          const isSelected = selected.has(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className="flex items-center gap-3 rounded-md px-1 py-2.5 text-left text-sm text-[#c2d0dd]"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-white/20">
                {isSelected ? <Check className="h-3 w-3 text-accent" /> : null}
              </span>
              {optionLabel(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
