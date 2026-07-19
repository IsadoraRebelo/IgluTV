import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ProfileSubNav, ShowsSectionSkeleton } from '@/components';
import { ShowsSection } from '@/components/Profile/ShowsSection';

import { getProfileByUsername } from '@/services/profile';

export default async function WatchedShowsPage({
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
          active="shows"
        />
        <Suspense fallback={<ShowsSectionSkeleton />}>
          <ShowsSection userId={profile.id} />
        </Suspense>
      </main>
    </div>
  );
}
