'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AuthDialog } from '@/components';
import { cn } from '@/utils';

type NavBarClientProps = {
  username: string | null;
};

export function NavBarClient({ username }: NavBarClientProps) {
  const pathname = usePathname();
  const isOverlay =
    pathname.startsWith('/show/') ||
    (pathname.startsWith('/profile/') && pathname !== '/profile');

  return (
    <header
      className={cn(
        'flex h-16 items-center',
        isOverlay ? 'bg-transparent absolute inset-x-0 top-0 z-50 ' : 'bg-background text-foreground'
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 md:px-15">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-accent"
        >
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
          <div className="relative hidden sm:block">
            <Search
              className={cn(
                'pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2',
                isOverlay ? 'text-white/50' : 'text-foreground/50'
              )}
            />
            <input
              type="text"
              disabled
              placeholder="Search"
              className={cn(
                'h-9 w-48 rounded-full pl-9 pr-3 text-sm disabled:cursor-not-allowed',
                isOverlay
                  ? 'bg-white/10 text-white placeholder:text-white/50'
                  : 'bg-foreground/10 text-foreground placeholder:text-foreground/50'
              )}
            />
          </div>

          {username ? (
            <Link
              href={`/profile/${username}`}
              className={cn(
                'text-sm font-semibold transition-colors',
                isOverlay
                  ? 'text-white/80 hover:text-white'
                  : 'text-foreground/80 hover:text-foreground'
              )}
            >
              {username}
            </Link>
          ) : (
            <AuthDialog />
          )}
        </div>
      </div>
    </header>
  );
}
