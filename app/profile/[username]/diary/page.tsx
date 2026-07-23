import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { DiarySectionSkeleton } from '@/components';
import { DiarySection } from '@/components/Profile/DiarySection';

import { getProfileByUsername } from '@/services/profile';
import { getViewerId } from '@/services/viewer';

export default async function DiaryPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const viewerId = await getViewerId();

  if (!viewerId || viewerId !== profile.id) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <main className="container-shell flex-1 pt-5 pb-2 md:pt-10">
        <Suspense fallback={<DiarySectionSkeleton />}>
          <DiarySection userId={profile.id} viewerId={viewerId} />
        </Suspense>
      </main>
    </div>
  );
}
