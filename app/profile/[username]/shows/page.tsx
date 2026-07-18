import { notFound } from 'next/navigation';

import { ProfileSubNav, WatchedShowsView } from '@/components';
import { getDisplayStatus } from '@/components/ShowTracker/utils';
import type { WatchedShowEntry } from '@/components/WatchedShows/WatchedShowsView';

import { getProfileByUsername } from '@/services/profile';
import {
  getShowsForUser,
  getWatchedEpisodeCountsForUser,
} from '@/services/tracking';
import { resolveShowSummaries } from '@/services/tv-shows';

export default async function WatchedShowsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const trackedShows = await getShowsForUser(profile.id);
  const trackedNotWatchlist = trackedShows.filter(
    (s) => s.status !== 'watch_later'
  );

  const watchedCounts = await getWatchedEpisodeCountsForUser(
    profile.id,
    trackedNotWatchlist.map((s) => s.tmdbShowId)
  );

  const watchedTracking = trackedNotWatchlist.filter(
    (s) => (watchedCounts.get(s.tmdbShowId) ?? 0) > 0
  );

  const summaries = await resolveShowSummaries(
    watchedTracking.map((s) => s.tmdbShowId)
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

  return (
    <div className="flex flex-1 flex-col">
      <main className="container-wide flex-1 pt-10 pb-20">
        <ProfileSubNav
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          active="shows"
        />
        <WatchedShowsView entries={entries} />
      </main>
    </div>
  );
}
