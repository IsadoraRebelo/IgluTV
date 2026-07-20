'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/utils';

export function HomeSearchBar({
  containerClassName = 'container-shell',
  initialQuery = '',
}: {
  containerClassName?: string;
  initialQuery?: string;
} = {}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(containerClassName, 'lg:hidden')}
    >
      <div className="flex h-10 items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-5 backdrop-blur-xl">
        <Search className="h-4 w-4 shrink-0 text-white/50" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a show or cast member"
          className="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
        />
      </div>
    </form>
  );
}
