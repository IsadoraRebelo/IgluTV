import { WatchlistView } from '@/components';
import type { WatchlistEntry } from '@/components/WatchlistGrid/WatchlistView';


import { getCatalogueShows } from '@/services/show-catalogue';
import { getShowsForUser } from '@/services/tracking';

export async function WatchlistSection({ userId }: { userId: string }) {
  const watchlistTracking = await getShowsForUser(userId, 'watch_later');
  const summaries = await getCatalogueShows(
    watchlistTracking.map((s) => s.tmdbShowId)
  );

  const entries: WatchlistEntry[] = watchlistTracking
    .map((tracking): WatchlistEntry | null => {
      const show = summaries.get(tracking.tmdbShowId);
      if (!show) return null;

      const decade = show.year ? Math.floor(Number(show.year) / 10) * 10 : null;

      return {
        show,
        decade,
        createdAt: tracking.createdAt,
      };
    })
    .filter((entry): entry is WatchlistEntry => entry !== null);

  return <WatchlistView entries={entries} />;
}
