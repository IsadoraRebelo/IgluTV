import Image from 'next/image';
import Link from 'next/link';

import { WatchProgressBar } from '@/components/WatchProgressBar/WatchProgressBar';

import type { PersonCastCredit } from '@/types';

export function CastCreditCard({
  credit,
  watchedCount,
}: {
  credit: PersonCastCredit;
  watchedCount: number | null;
}) {
  return (
    <Link href={`/show/${credit.showId}`} className="flex flex-col gap-1">
      <div className="bg-surface relative aspect-[2/3] w-full overflow-hidden rounded-sm">
        {credit.posterUrl ? (
          <Image
            src={credit.posterUrl}
            alt={credit.showName}
            fill
            sizes="(max-width: 640px) 33vw, 20vw"
            className="object-cover"
          />
        ) : null}
        {watchedCount !== null ? (
          <WatchProgressBar
            watchedCount={watchedCount}
            markableCount={credit.episodeCount}
            showStatus={null}
            showCount={false}
            className="absolute inset-x-0 bottom-0 h-1"
          />
        ) : null}
      </div>
      <p className="text-text-secondary truncate text-xs">
        {credit.episodeCount} episode{credit.episodeCount === 1 ? '' : 's'}
      </p>
    </Link>
  );
}
