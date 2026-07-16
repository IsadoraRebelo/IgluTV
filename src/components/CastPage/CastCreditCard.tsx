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
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-[#2c3440]">
        {credit.posterUrl ? (
          <Image
            src={credit.posterUrl}
            alt={credit.showName}
            fill
            sizes="(max-width: 640px) 33vw, 20vw"
            className="object-cover"
          />
        ) : null}
      </div>
      {watchedCount !== null ? (
        <WatchProgressBar
          watchedCount={watchedCount}
          markableCount={credit.episodeCount}
          showStatus={null}
          showCount={false}
          className="h-1.5 rounded-sm"
        />
      ) : null}
      <p className="truncate text-xs text-[#8a9bab]">
        {credit.episodeCount} episode{credit.episodeCount === 1 ? '' : 's'}
      </p>
    </Link>
  );
}
