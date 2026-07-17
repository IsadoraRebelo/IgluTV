import Image from 'next/image';
import Link from 'next/link';

import { WatchProgressBar } from '@/components/WatchProgressBar/WatchProgressBar';

import type { ShowStatus, ShowSummary } from '@/types';
import { cn } from '@/utils';

export function PosterCard({
  show,
  caption,
  className,
  sizes = '128px',
  progress,
}: {
  show: ShowSummary;
  caption?: string;
  className?: string;
  sizes?: string;
  progress?: { watchedCount: number; showStatus: ShowStatus | null };
}) {
  return (
    <Link href={`/show/${show.id}`} className={cn('flex flex-col gap-1', className)}>
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-[#2c3440]">
        {show.posterUrl ? (
          <Image
            src={show.posterUrl}
            alt={show.name}
            fill
            sizes={sizes}
            className="object-cover"
          />
        ) : null}
        {progress ? (
          <WatchProgressBar
            watchedCount={progress.watchedCount}
            markableCount={show.markableEpisodeCount}
            showStatus={progress.showStatus}
            showCount={false}
            className="absolute inset-x-0 bottom-0 h-1"
          />
        ) : null}
      </div>
      {caption ? (
        <p className="truncate text-xs text-[#8a9bab]">{caption}</p>
      ) : null}
    </Link>
  );
}
