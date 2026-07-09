import Image from 'next/image';
import Link from 'next/link';

import type { TvShow } from '@/types';

export function TvShowCard({ show }: { show: TvShow }) {
  const year = show.firstAirDate ? show.firstAirDate.slice(0, 4) : '—';

  return (
    <Link href={`/show/${show.id}`} className="flex flex-col gap-2">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800">
        {show.posterUrl ? (
          <Image
            src={show.posterUrl}
            alt={show.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
            No poster
          </div>
        )}
        <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
          {show.voteAverage.toFixed(1)}
        </span>
      </div>
      <div>
        <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {show.name}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{year}</p>
      </div>
    </Link>
  );
}
