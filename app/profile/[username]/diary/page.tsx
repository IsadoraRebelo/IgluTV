import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { DiarySectionSkeleton, ProfileSubNav } from '@/components';
import { DiarySection } from '@/components/Profile/DiarySection';

import { getProfileByUsername } from '@/services/profile';

export default async function DiaryPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <main className="container-shell flex-1 pt-5 md:pt-10 pb-2">
        <ProfileSubNav
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          active="diary"
        />
        <Suspense fallback={<DiarySectionSkeleton />}>
          <DiarySection userId={profile.id} />
        </Suspense>
      </main>
    </div>
  );
}
