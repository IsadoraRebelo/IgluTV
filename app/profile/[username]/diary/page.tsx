import { notFound } from 'next/navigation';

import { DiaryPageView, ProfileSubNav } from '@/components';

import { getProfileByUsername } from '@/services/profile';
import {
  getFinishedSeasonsForUser,
  getFinishedShowsForUser,
} from '@/services/tracking';
import { resolveShowSummaries } from '@/services/tv-shows';

import { buildDiaryEntries } from '@/utils';

export default async function DiaryPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const [finishedRows, finishedSeasonRows] = await Promise.all([
    getFinishedShowsForUser(profile.id),
    getFinishedSeasonsForUser(profile.id),
  ]);

  const showIds = Array.from(
    new Set([
      ...finishedRows.map((r) => r.tmdbShowId),
      ...finishedSeasonRows.map((r) => r.tmdbShowId),
    ])
  );
  const summaries = await resolveShowSummaries(showIds);

  const entries = buildDiaryEntries(
    finishedRows,
    finishedSeasonRows,
    summaries
  );

  return (
    <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pt-10 pb-20 md:px-0">
        <ProfileSubNav
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          active="diary"
        />
        <DiaryPageView entries={entries} />
      </main>
    </div>
  );
}
