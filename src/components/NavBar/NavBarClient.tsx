'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';

import { cn } from '@/utils';

import { NavBarUserMenu } from './NavBarUserMenu';

export function NavBarClient() {
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

          <Suspense
            fallback={
              <div className="h-4 w-16 animate-pulse rounded-full bg-white/10" />
            }
          >
            <NavBarUserMenu isOverlay={isOverlay} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
