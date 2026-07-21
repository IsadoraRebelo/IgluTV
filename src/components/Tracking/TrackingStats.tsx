import { BookmarkIcon, ClockIcon, FilmIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

type TrackingStatsProps = {
  episodesLeft: number;
  runtimeLabel: string;
  watchlistCount: number;
  watchlistHref: string | null;
};

export function TrackingStatsPills({
  episodesLeft,
  runtimeLabel,
  watchlistCount,
  watchlistHref,
}: TrackingStatsProps) {
  const pillClassName =
    'flex-1 rounded-md border border-white/[0.07] bg-white/5 py-1.5 text-center';

  return (
    <div className="flex gap-2">
      <div className={pillClassName}>
        <span className="text-text-tertiary text-[11px]">
          <b className="text-foreground text-sm">{episodesLeft}</b> eps left
        </span>
      </div>
      <div className={pillClassName}>
        <span className="text-text-tertiary text-[11px]">
          <b className="text-foreground text-sm">{runtimeLabel}</b> to catch
          up
        </span>
      </div>
      {watchlistHref ? (
        <Link href={watchlistHref} className={pillClassName}>
          <span className="text-text-tertiary text-[11px]">
            <b className="text-foreground text-sm">{watchlistCount}</b>{' '}
            watchlist
          </span>
        </Link>
      ) : (
        <div className={pillClassName}>
          <span className="text-text-tertiary text-[11px]">
            <b className="text-foreground text-sm">{watchlistCount}</b>{' '}
            watchlist
          </span>
        </div>
      )}
    </div>
  );
}

export function TrackingSidebarStats({
  episodesLeft,
  runtimeLabel,
  watchlistCount,
  watchlistHref,
}: TrackingStatsProps) {
  const rowClassName =
    'text-foreground flex items-center gap-2 rounded-md px-3 py-2.5 text-sm';

  return (
    <div className="flex h-fit flex-col gap-1 rounded-lg bg-white/[0.03] p-2">
      <div className={rowClassName}>
        <FilmIcon className="h-4 w-4 shrink-0" />
        <span>
          {episodesLeft} episode{episodesLeft === 1 ? '' : 's'} to watch
        </span>
      </div>
      <div className={rowClassName}>
        <ClockIcon className="h-4 w-4 shrink-0" />
        <span>{runtimeLabel} to catch up</span>
      </div>
      {watchlistHref ? (
        <Link href={watchlistHref} className={`${rowClassName} hover:bg-white/5`}>
          <BookmarkIcon className="h-4 w-4 shrink-0" />
          <span>
            {watchlistCount} show{watchlistCount === 1 ? '' : 's'} on
            watchlist
          </span>
        </Link>
      ) : (
        <div className={rowClassName}>
          <BookmarkIcon className="h-4 w-4 shrink-0" />
          <span>
            {watchlistCount} show{watchlistCount === 1 ? '' : 's'} on
            watchlist
          </span>
        </div>
      )}
    </div>
  );
}
