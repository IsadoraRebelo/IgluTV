import Link from 'next/link';

import { ProfileSubNav, WatchedShowsView } from '@/components';
import { getDisplayStatus } from '@/components/ShowTracker/utils';
import type { WatchedShowEntry } from '@/components/WatchedShows/types';
import { getProfileByUsername } from '@/services/profile';
import {
  getShowsForUser,
  getWatchedEpisodeCountsForUser,
} from '@/services/tracking';
import { resolveShowSummaries } from '@/services/tv-shows';

function ProfileNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#14181c] px-6 py-24 text-center">
      <p className="text-[#9ab0bf]">Profile not found.</p>
      <Link
        href="/"
        className="mt-4 text-sm text-[#678] underline hover:text-[#9ab0bf]"
      >
        Back to home
      </Link>
    </div>
  );
}

export default async function WatchedShowsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) return <ProfileNotFound />;

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
      const decade = show.year
        ? Math.floor(Number(show.year) / 10) * 10
        : null;

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
    <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pt-5 pb-20 md:px-0">
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
