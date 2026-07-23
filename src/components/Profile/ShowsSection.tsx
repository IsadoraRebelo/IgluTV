import { WatchedShowsView } from '@/components';
import { getDisplayStatus } from '@/components/ShowTracker/utils';
import type { WatchedShowEntry } from '@/components/WatchedShows/WatchedShowsView';


import { getCatalogueShows } from '@/services/show-catalogue';
import {
  getShowsForUser,
  getWatchedEpisodeCountsForUser,
} from '@/services/tracking';

export async function ShowsSection({ userId }: { userId: string }) {
  const trackedShows = await getShowsForUser(userId);
  const trackedNotWatchlist = trackedShows.filter(
    (s) => s.status !== 'watch_later'
  );
  const trackedNotWatchlistIds = trackedNotWatchlist.map((s) => s.tmdbShowId);

  const [watchedCounts, summaries] = await Promise.all([
    getWatchedEpisodeCountsForUser(userId, trackedNotWatchlistIds),
    getCatalogueShows(trackedNotWatchlistIds),
  ]);

  const watchedTracking = trackedNotWatchlist.filter(
    (s) => (watchedCounts.get(s.tmdbShowId) ?? 0) > 0
  );

  const entries: WatchedShowEntry[] = watchedTracking
    .map((tracking): WatchedShowEntry | null => {
      const show = summaries.get(tracking.tmdbShowId);
      if (!show) return null;

      const watchedCount = watchedCounts.get(tracking.tmdbShowId) ?? 0;
      const displayStatus = getDisplayStatus(
        tracking.status,
        watchedCount,
        show.markableEpisodeCount
      );
      const decade = show.year ? Math.floor(Number(show.year) / 10) * 10 : null;

      return {
        show,
        watchedCount,
        status: tracking.status,
        displayStatus,
        decade,
        createdAt: tracking.createdAt,
      };
    })
    .filter((entry): entry is WatchedShowEntry => entry !== null);

  return <WatchedShowsView entries={entries} />;
}
