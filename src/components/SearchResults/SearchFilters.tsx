import Link from 'next/link';

import type { SearchType } from '@/services/search';

import { cn } from '@/utils';

const FILTERS: { id: SearchType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'shows', label: 'TV Shows' },
  { id: 'anime', label: 'Anime' },
  { id: 'cast', label: 'Cast' },
];

function filterHref(query: string, type: SearchType): string {
  return `/search?q=${encodeURIComponent(query)}&type=${type}`;
}

export function SearchFilters({
  query,
  active,
  variant,
}: {
  query: string;
  active: SearchType;
  variant: 'mobile' | 'desktop';
}) {
  if (variant === 'mobile') {
    return (
      <div className="flex border-b border-white/10 lg:hidden">
        {FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={filterHref(query, filter.id)}
            className={cn(
              '-mb-px flex-1 border-b-2 px-1 py-3 text-center text-sm font-medium transition-colors',
              active === filter.id
                ? 'border-accent text-white'
                : 'text-text-faint hover:text-text-tertiary border-transparent'
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <aside className="hidden h-fit flex-col gap-1 rounded-lg bg-white/[0.03] p-2 lg:flex">
      {FILTERS.map((filter) => (
        <Link
          key={filter.id}
          href={filterHref(query, filter.id)}
          className={cn(
            'text-md rounded-md px-3 py-2.5 text-left hover:bg-white/5',
            active === filter.id ? 'text-white' : 'text-text-primary'
          )}
        >
          {filter.label}
        </Link>
      ))}
    </aside>
  );
}
