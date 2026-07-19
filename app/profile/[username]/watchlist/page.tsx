import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ProfileSubNav, WatchlistSectionSkeleton } from '@/components';
import { WatchlistSection } from '@/components/Profile/WatchlistSection';

import { getProfileByUsername } from '@/services/profile';

export default async function WatchlistPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <main className="container-wide flex-1 pt-10 pb-20">
        <ProfileSubNav
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          active="watchlist"
        />
        <Suspense fallback={<WatchlistSectionSkeleton />}>
          <WatchlistSection userId={profile.id} />
        </Suspense>
      </main>
    </div>
  );
}
