'use client';

import { Search } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import { Input } from '@/components';

import { type BannerShowOption, getMyShowsForBannerPickerAction } from './actions';

export function BannerShowsView({
  onCancel,
  onSelectShow,
}: {
  onCancel: () => void;
  onSelectShow: (show: BannerShowOption) => void;
}) {
  const [shows, setShows] = useState<BannerShowOption[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getMyShowsForBannerPickerAction().then(setShows);
  }, []);

  const filteredShows = useMemo(() => {
    if (!shows) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return shows;
    return shows.filter((show) =>
      show.name.toLowerCase().includes(normalizedQuery)
    );
  }, [shows, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-[#8a9bab] hover:text-white"
        >
          Cancel
        </button>
        <h2 className="text-base font-semibold text-white">Banner</h2>
        <span className="w-12" aria-hidden="true" />
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8a9bab]" />
          <Input
            variant="secondary"
            placeholder="Search for a show"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        {shows === null ? (
          <p className="text-sm text-[#8a9bab]">Loading your shows…</p>
        ) : shows.length === 0 ? (
          <p className="text-sm text-[#8a9bab]">
            Track some shows to use their backdrops as your banner.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {filteredShows.map((show) => (
              <button
                key={show.id}
                type="button"
                onClick={() => onSelectShow(show)}
                className="flex flex-col gap-1 text-left"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-[#2c3440]">
                  {show.posterUrl ? (
                    <Image
                      src={show.posterUrl}
                      alt={show.name}
                      fill
                      sizes="(max-width: 640px) 30vw, 140px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <p className="truncate text-xs text-[#c2d0dd]">{show.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
