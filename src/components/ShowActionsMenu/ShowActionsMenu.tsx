'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

export function ShowActionsMenu({
  actions,
}: {
  actions: { icon: ReactNode; label: string }[];
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="More options"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-lg bg-[#1c232b] p-2 shadow-2xl ring-1 ring-white/10
            data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
        >
          {actions.map(({ icon, label }) => (
            <DropdownMenu.Item
              key={label}
              className="flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] outline-none data-[highlighted]:bg-white/5"
            >
              {icon}
              {label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
