'use client';

import * as HoverCard from '@radix-ui/react-hover-card';
import { ChevronDown, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthDialog, LogOutButton } from '@/components';

import { cn } from '@/utils';

type NavBarClientProps = {
  username: string | null;
};

export function NavBarClient({ username }: NavBarClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const isOverlay =
    pathname === '/' ||
    pathname.startsWith('/show/') ||
    /^\/profile\/[^/]+$/.test(pathname);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header
      className={cn(
        'flex h-16 items-center',
        isOverlay
          ? 'absolute inset-x-0 top-0 z-50 bg-transparent'
          : 'bg-background text-foreground'
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 md:px-15">
        <Link href="/" className="text-accent text-lg font-bold tracking-tight">
          Iglu <span className="font-normal">tv</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-semibold">
          <Link
            href="/tracking"
            className={cn(
              'transition-colors',
              isOverlay
                ? 'text-white/80 hover:text-white'
                : 'text-foreground/80 hover:text-foreground'
            )}
          >
            Tracker
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <form
            onSubmit={handleSearchSubmit}
            className="relative hidden sm:block"
          >
            <button
              type="submit"
              aria-label="Search"
              className={cn(
                'absolute top-1/2 left-3 -translate-y-1/2 border-0 bg-transparent p-0',
                isOverlay
                  ? 'text-white/50 hover:text-white/80'
                  : 'text-foreground/50 hover:text-foreground/80'
              )}
            >
              <Search className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className={cn(
                'h-9 w-48 rounded-full pr-3 pl-9 text-sm',
                isOverlay
                  ? 'bg-white/10 text-white placeholder:text-white/50'
                  : 'bg-foreground/10 text-foreground placeholder:text-foreground/50'
              )}
            />
          </form>

          {username ? (
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
                      'data-[state=open]:z-50 data-[state=open]:w-40 data-[state=open]:justify-start data-[state=open]:rounded-t-lg data-[state=open]:border data-[state=open]:border-b-0 data-[state=open]:border-white/10 data-[state=open]:bg-muted data-[state=open]:px-3 data-[state=open]:py-2 data-[state=open]:shadow-2xl',
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
                    className="data-[state=open]:animate-fade-in px-3 data-[state=closed]:animate-fade-out z-50 w-40 rounded-b-lg border border-white/10 bg-muted p-2 shadow-2xl"
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
                          pathname === item.href
                            ? 'text-white'
                            : 'text-[#c2d0dd]'
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="my-1 border-t border-white/10" />
                    <LogOutButton className="block w-full rounded-md py-1 text-left text-sm text-[#c2d0dd] no-underline outline-none" />
                  </HoverCard.Content>
                </HoverCard.Portal>
              </div>
            </HoverCard.Root>
          ) : (
            <AuthDialog />
          )}
        </div>
      </div>
    </header>
  );
}
