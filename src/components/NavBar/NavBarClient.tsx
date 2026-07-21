'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';

import { cn } from '@/utils';

import { NavBarAvatar } from './NavBarAvatar';
import { NavBarPillLinks } from './NavBarPillLinks';

export function NavBarClient() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
        'hidden min-h-16 items-center pt-[env(safe-area-inset-top)] lg:flex',
        isOverlay
          ? 'absolute inset-x-0 top-0 z-50 bg-transparent'
          : 'border-b border-foreground/10 bg-background text-foreground'
      )}
    >
      <div className="container-shell relative flex items-center justify-between gap-6 py-6">
        <Link
          href="/"
          className="text-accent font-heading text-xl font-extrabold tracking-tight sm:text-3xl"
        >
          Iglu <span className="text-foreground font-normal">tv</span>
        </Link>

        <nav
          className={cn(
            'absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border p-1',
            isOverlay
              ? 'border-white/10 bg-white/5'
              : 'border-foreground/10 bg-foreground/5'
          )}
        >
          <Suspense fallback={null}>
            <NavBarPillLinks isOverlay={isOverlay} />
          </Suspense>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <button
              type="button"
              aria-label="Search"
              onClick={() => searchInputRef.current?.focus()}
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
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => {
                if (!query.trim()) setSearchOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setQuery('');
                  setSearchOpen(false);
                  searchInputRef.current?.blur();
                }
              }}
              placeholder="Search"
              aria-label="Search"
              className={cn(
                'h-9 rounded-full pr-3 pl-9 text-sm transition-[width] duration-200 ease-out',
                searchOpen ? 'w-48' : 'w-9 cursor-pointer',
                isOverlay
                  ? 'bg-white/10 text-white placeholder:text-white/50'
                  : 'bg-foreground/10 text-foreground placeholder:text-foreground/50'
              )}
            />
          </form>

          <Suspense
            fallback={
              <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
            }
          >
            <NavBarAvatar />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
