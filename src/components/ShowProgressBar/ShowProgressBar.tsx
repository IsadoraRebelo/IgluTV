'use client';

import { useShowTrackingContext } from '@/components/ShowTracker/ShowTrackingContext';
import { episodeKey, getDaysUntilAir, getWatchCount } from '@/components/ShowTracker/utils';
import { WatchProgressBar } from '@/components/WatchProgressBar/WatchProgressBar';

import type { Season } from '@/types';

export function ShowProgressBar({
  seasons,
  className = '',
}: {
  seasons: Season[];
  className?: string;
}) {
  const { watchedDates, showStatus } = useShowTrackingContext();

  if (showStatus === null) return null;

  const markableEpisodes = seasons
    .filter((season) => season.seasonNumber > 0)
    .flatMap((season) =>
      season.episodes
        .filter((ep) => getDaysUntilAir(ep.airDate) === null)
        .map((ep) => episodeKey(season.seasonNumber, ep.episodeNumber))
    );

  const watchedCount = markableEpisodes.filter(
    (key) => getWatchCount(watchedDates, key) > 0
  ).length;

  return (
    <WatchProgressBar
      watchedCount={watchedCount}
      markableCount={markableEpisodes.length}
      showStatus={showStatus}
      className={`h-4 rounded-xs px-2 md:h-3 ${className}`}
    />
  );
}
