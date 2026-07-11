'use client';

import { EyeSlashIcon } from '@heroicons/react/24/solid';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, RotateCcw, Undo2 } from 'lucide-react';

export function WatchedToggleButton({
  isWatched,
  isPending,
  rewatchCount,
  markLabel,
  rewatchLabel,
  removeLabel,
  removeRewatchesLabel,
  onMark,
  onRewatch,
  onRemove,
  onRemoveRewatches,
}: {
  isWatched: boolean;
  isPending: boolean;
  rewatchCount: number;
  markLabel: string;
  rewatchLabel: string;
  removeLabel: string;
  removeRewatchesLabel: string;
  onMark: () => void;
  onRewatch: () => void;
  onRemove: () => void;
  onRemoveRewatches: () => void;
}) {
  const buttonClassName = `flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#14181c] transition-colors disabled:opacity-50 ${isWatched ? 'bg-[#66cc24]' : 'bg-accent'
    }`;

  if (!isWatched) {
    return (
      <button
        type="button"
        aria-label={markLabel}
        disabled={isPending}
        onClick={onMark}
        className={buttonClassName}
      >
        <Check className="h-4 w-4 text-white" />
      </button>
    );
  }

  const triggerLabel =
    rewatchCount > 0
      ? `${markLabel} — rewatched ${rewatchCount} time${rewatchCount === 1 ? '' : 's'} — open options`
      : `${markLabel} — open options`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          disabled={isPending}
          className={buttonClassName}
        >
          {rewatchCount > 0 ? (
            <span className="text-sm font-bold text-white">
              x{rewatchCount}
            </span>
          ) : (
            <Check className="h-5 w-5 text-white" />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="bg-primary-foreground data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out z-50 w-48 rounded-lg p-2 shadow-2xl ring-1 ring-white/10"
        >
          <DropdownMenu.Item
            onClick={onRewatch}
            className="flex cursor-default cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] outline-none data-[highlighted]:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" />
            {rewatchLabel}
          </DropdownMenu.Item>
          {rewatchCount > 0 ? (
            <DropdownMenu.Item
              onClick={onRemoveRewatches}
              className="flex cursor-default cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] outline-none data-[highlighted]:bg-white/5"
            >
              <Undo2 className="h-4 w-4" />
              {removeRewatchesLabel}
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item
            onClick={onRemove}
            className="flex cursor-default cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] outline-none data-[highlighted]:bg-white/5"
          >
            <EyeSlashIcon className="h-4 w-4" />
            {removeLabel}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
