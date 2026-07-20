'use client';

import { useState } from 'react';

import * as HoverCard from '@radix-ui/react-hover-card';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/utils';

const DEFAULT_DROPDOWN_WIDTH = 224;

export function FilterDropdown<T extends string | number>({
  label,
  options,
  optionLabel,
  selected,
  onToggle,
  width = DEFAULT_DROPDOWN_WIDTH,
}: {
  label: string;
  options: T[];
  optionLabel: (value: T) => string;
  selected: Set<T>;
  onToggle: (value: T) => void;
  width?: number;
}) {
  const [open, setOpen] = useState(false);

  if (options.length === 0) return null;

  const labelContent = (
    <>
      {label}
      {selected.size > 0 ? ` (${selected.size})` : ''}
      <ChevronDown className="h-3 w-3" />
    </>
  );

  return (
    <HoverCard.Root openDelay={100} closeDelay={150} onOpenChange={setOpen}>
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
            style={open ? { width } : undefined}
            className={cn(
              'absolute top-0 left-0 flex items-center gap-1 whitespace-nowrap text-xs font-semibold tracking-wide uppercase',
              'data-[state=open]:bg-muted data-[state=open]:z-50 data-[state=open]:mt-[-7px] data-[state=open]:justify-start data-[state=open]:rounded-t-sm data-[state=open]:border data-[state=open]:border-b-0 data-[state=open]:border-white/10 data-[state=open]:px-3 data-[state=open]:py-2 data-[state=open]:shadow-2xl',
              selected.size > 0 ? 'text-white' : 'text-text-tertiary'
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
            className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out w-[var(--radix-hover-card-trigger-width)] bg-muted z-50 max-h-80 overflow-y-auto rounded-b-sm border border-white/10 shadow-2xl"
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
                  className={cn(
                    'flex w-full items-center gap-2 text-left text-sm outline-none p-2 px-4 hover:bg-white/10',
                    isSelected ? 'text-white' : 'text-text-primary'
                  )}
                >
                  {isSelected ? (
                    <span className="flex h-4 w-4 items-center justify-center">
                      <Check className="text-accent h-3 w-3" />
                    </span>
                  ) : null}
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
  width = DEFAULT_DROPDOWN_WIDTH,
}: {
  sortKey: K;
  sortDirection: 'asc' | 'desc';
  labels: Record<K, string>;
  onSortChange: (key: K) => void;
  // Open-state width in pixels — pass the longest "Sort by X" label's page
  // needs, since it's shared across every sort key on that page.
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(labels) as K[];

  const labelContent = (
    <>
      Sort by {labels[sortKey]}
      {sortDirection === 'asc' ? ' ↑' : ' ↓'}
      <ChevronDown className="h-3 w-3" />
    </>
  );

  return (
    <HoverCard.Root openDelay={100} closeDelay={150} onOpenChange={setOpen}>
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
            style={open ? { width } : undefined}
            className={cn(
              'text-text-tertiary absolute top-0 left-0 flex items-center gap-1 whitespace-nowrap text-xs font-semibold tracking-wide uppercase',
              'data-[state=open]:bg-muted data-[state=open]:z-50 data-[state=open]:mt-[-7px] data-[state=open]:justify-start data-[state=open]:rounded-t-sm data-[state=open]:border data-[state=open]:border-b-0 data-[state=open]:border-white/10 data-[state=open]:px-3 data-[state=open]:py-2 data-[state=open]:shadow-2xl'
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
            className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out w-[var(--radix-hover-card-trigger-width)] bg-muted z-50 max-h-80 overflow-y-auto rounded-b-sm border border-white/10 shadow-2xl"
          >
            {keys.map((key) => {
              const isSelected = key === sortKey;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSortChange(key)}
                  className={cn(
                    'flex w-full items-center gap-2 text-left text-sm outline-none p-2 px-4 hover:bg-white/10',
                    isSelected ? 'text-white' : 'text-text-primary'
                  )}
                >
                  {isSelected ? (
                    <span className="flex h-4 w-4 items-center justify-center">
                      <span className="text-accent text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    </span>
                  ) : null}
                  {labels[key]}
                </button>
              );
            })}
          </HoverCard.Content>
        </HoverCard.Portal>
      </div>
    </HoverCard.Root>
  );
}

export function MobileFilterSection<T extends string | number>({
  label,
  options,
  optionLabel,
  selected,
  onToggle,
  showBorder = true,
}: {
  label: string;
  options: T[];
  optionLabel: (value: T) => string;
  selected: Set<T>;
  onToggle: (value: T) => void;
  showBorder?: boolean;
}) {
  if (options.length === 0) return null;

  return (
    <div className={cn('py-3', showBorder ? 'border-b border-white/10' : '')}>
      <h3 className="text-muted-foreground px-1 pb-2 text-xs font-semibold tracking-wide uppercase">
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
              className="text-text-primary flex items-center gap-2 rounded-md px-1 py-1 text-left text-sm"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-white/20">
                {isSelected ? <Check className="text-accent h-3 w-3" /> : null}
              </span>
              {optionLabel(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
