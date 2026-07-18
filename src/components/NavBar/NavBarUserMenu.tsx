'use client';

import * as HoverCard from '@radix-ui/react-hover-card';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AuthDialog, LogOutButton } from '@/components';
import { useViewer } from '@/components/ViewerProvider/ViewerProvider';

import { cn } from '@/utils';

export function NavBarUserMenu({ isOverlay }: { isOverlay: boolean }) {
  const { username } = useViewer();
  const pathname = usePathname();

  if (!username) {
    return <AuthDialog />;
  }

  return (
    <HoverCard.Root openDelay={100} closeDelay={150}>
      <div className="relative">
        {/* Reserves the closed-state footprint so the absolutely
            positioned trigger below can grow open without reflowing
            the rest of the navbar. */}
        <span
          aria-hidden="true"
          className="invisible flex items-center gap-1 text-sm font-semibold"
        >
          {username}
          <ChevronDown className="h-3 w-3" />
        </span>
        <HoverCard.Trigger asChild>
          <button
            type="button"
            className={cn(
              'absolute top-0 right-0 flex items-center gap-1 text-sm font-semibold transition-colors',
              'data-[state=open]:bg-muted data-[state=open]:z-50 data-[state=open]:w-40 data-[state=open]:justify-start data-[state=open]:rounded-t-lg data-[state=open]:border data-[state=open]:border-b-0 data-[state=open]:border-white/10 data-[state=open]:px-3 data-[state=open]:py-2 data-[state=open]:shadow-2xl',
              isOverlay
                ? 'text-white/80 hover:text-white'
                : 'text-foreground/80 hover:text-foreground'
            )}
          >
            {username}
            <ChevronDown className="h-3 w-3" />
          </button>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content
            side="bottom"
            align="end"
            sideOffset={0}
            className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out bg-muted z-50 w-40 rounded-b-lg border border-white/10 p-2 px-3 shadow-2xl"
          >
            {[
              { href: `/profile/${username}`, label: 'Profile' },
              { href: `/profile/${username}/shows`, label: 'Shows' },
              { href: `/profile/${username}/diary`, label: 'Diary' },
              {
                href: `/profile/${username}/watchlist`,
                label: 'Watchlist',
              },
              { href: '/account', label: 'Account' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-md py-1 text-sm outline-none',
                  pathname === item.href ? 'text-white' : 'text-text-primary'
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-1 border-t border-white/10" />
            <LogOutButton className="text-text-primary block w-full rounded-md py-1 text-left text-sm no-underline outline-none" />
          </HoverCard.Content>
        </HoverCard.Portal>
      </div>
    </HoverCard.Root>
  );
}
