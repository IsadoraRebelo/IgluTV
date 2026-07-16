'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 text-xs font-semibold tracking-wide uppercase',
            selected.size > 0 ? 'text-white' : 'text-[#9ab0bf]'
          )}
        >
          {label}
          {selected.size > 0 ? ` (${selected.size})` : ''}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out z-50 max-h-80 w-56 overflow-y-auto rounded-lg bg-muted p-2 shadow-2xl ring-1 ring-white/10"
        >
          {options.map((option) => {
            const isSelected = selected.has(option);
            return (
              <DropdownMenu.CheckboxItem
                key={option}
                checked={isSelected}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() => onToggle(option)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[#c2d0dd] outline-none data-[highlighted]:bg-white/5"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-white/20">
                  {isSelected ? <Check className="h-3 w-3 text-accent" /> : null}
                </span>
                {optionLabel(option)}
              </DropdownMenu.CheckboxItem>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
