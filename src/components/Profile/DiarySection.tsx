import { DiaryPageView } from '@/components';

import {
  getFinishedSeasonsForUser,
  getFinishedShowsForUser,
} from '@/services/tracking';
import { resolveShowSummaries } from '@/services/tv-shows';

import { buildDiaryEntries } from '@/utils';

export async function DiarySection({
  userId,
  viewerId,
}: {
  userId: string;
  viewerId: string | null;
}) {
  const [finishedRows, finishedSeasonRows] = await Promise.all([
    getFinishedShowsForUser(userId),
    getFinishedSeasonsForUser(userId),
  ]);

  const showIds = Array.from(
    new Set([
      ...finishedRows.map((r) => r.tmdbShowId),
      ...finishedSeasonRows.map((r) => r.tmdbShowId),
    ])
  );
  const summaries = await resolveShowSummaries(showIds, viewerId);

  const entries = buildDiaryEntries(
    finishedRows,
    finishedSeasonRows,
    summaries
  );

  return <DiaryPageView entries={entries} />;
}
