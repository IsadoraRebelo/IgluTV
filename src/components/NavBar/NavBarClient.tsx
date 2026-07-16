'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthDialog } from '@/components';

import { cn } from '@/utils';

type NavBarClientProps = {
  username: string | null;
};

export function NavBarClient({ username }: NavBarClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const isOverlay =
    pathname.startsWith('/show/') || /^\/profile\/[^/]+$/.test(pathname);

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
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-1 text-sm font-semibold transition-colors',
                    isOverlay
                      ? 'text-white/80 hover:text-white'
                      : 'text-foreground/80 hover:text-foreground'
                  )}
                >
                  {username}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out z-50 w-40 rounded-lg bg-muted p-2 shadow-2xl ring-1 ring-white/10"
                >
                  {[
                    { href: `/profile/${username}`, label: 'Profile' },
                    { href: `/profile/${username}/shows`, label: 'Shows' },
                    { href: `/profile/${username}/watchlist`, label: 'Watchlist' },
                  ].map((item) => (
                    <DropdownMenu.Item key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'block rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-white/5',
                          pathname === item.href
                            ? 'text-white'
                            : 'text-[#c2d0dd]'
                        )}
                      >
                        {item.label}
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <AuthDialog />
          )}
        </div>
      </div>
    </header>
  );
}
