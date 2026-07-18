import { notFound } from 'next/navigation';

import { ProfileSubNav, WatchlistView } from '@/components';
import type { WatchlistEntry } from '@/components/WatchlistGrid/WatchlistView';

import { getProfileByUsername } from '@/services/profile';
import { getShowsForUser } from '@/services/tracking';
import { resolveShowSummaries } from '@/services/tv-shows';

export default async function WatchlistPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const watchlistTracking = await getShowsForUser(profile.id, 'watch_later');
  const summaries = await resolveShowSummaries(
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

  return (
    <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pt-10 pb-20 md:px-0">
        <ProfileSubNav
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          active="watchlist"
        />
        <WatchlistView entries={entries} />
      </main>
    </div>
  );
}
