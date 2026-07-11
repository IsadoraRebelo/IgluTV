import { redirect } from 'next/navigation';

import { WatchListRow } from '@/components';

import {
  buildWatchedDatesMap,
  getEpisodeSectionState,
  getPriorUnwatchedAiredEpisodes,
  hasEpisodeAired,
} from '@/components/ShowTracker/utils';

import { getMyShows, getWatchedEpisodes } from '@/services/tracking';
import { getTmdbShowFullDetails } from '@/services/tv-shows';

import { createClient } from '@/supabase/server';

import type {
  CastMember,
  EpisodeWatch,
  LatestEpisode,
  Season,
  ShowStatus,
  ShowTracking,
} from '@/types';

const NEW_BADGE_WINDOW_DAYS = 7;

function isRecentlyAired(airDate: string | null): boolean {
  if (!airDate) return false;
  const date = new Date(`${airDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceAired = Math.round(
    (today.getTime() - date.getTime()) / 86_400_000
  );
  return daysSinceAired >= 0 && daysSinceAired <= NEW_BADGE_WINDOW_DAYS;
}

type WatchListEntry = {
  showId: number;
  showName: string;
  episode: LatestEpisode;
  backlogCount: number;
  badge: 'new' | 'premiere' | null;
  sortKey: string | null;
  seasons: Season[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
  cast: CastMember[];
};

async function buildWatchListEntry(
  tracked: ShowTracking
): Promise<WatchListEntry | null> {
  let tmdbFull: Awaited<ReturnType<typeof getTmdbShowFullDetails>>;
  let watchedEpisodes: Awaited<ReturnType<typeof getWatchedEpisodes>>;
  try {
    [tmdbFull, watchedEpisodes] = await Promise.all([
      getTmdbShowFullDetails(tracked.tmdbShowId),
      getWatchedEpisodes(tracked.tmdbShowId),
    ]);
  } catch (err) {
    console.warn('[tracking] entry fetch failed', err);
    return null;
  }
  if (!tmdbFull) return null;

  const { details, meta } = tmdbFull;
  const watchedDates = buildWatchedDatesMap(watchedEpisodes);
  const section = getEpisodeSectionState(meta, details, watchedDates);

  if (section.kind === 'hidden' || section.kind === 'caught-up') return null;
  if (section.kind === 'next' && !hasEpisodeAired(section.episode.airDate)) {
    return null;
  }

  const episode = section.episode;
  const backlogCount =
    section.kind === 'next'
      ? getPriorUnwatchedAiredEpisodes(
          meta.seasons,
          watchedDates,
          episode.seasonNumber,
          episode.episodeNumber
        ).length
      : 0;

  const badge: 'new' | 'premiere' | null =
    episode.episodeNumber === 1
      ? 'premiere'
      : isRecentlyAired(episode.airDate)
        ? 'new'
        : null;

  let sortKey: string | null = null;
  for (const dates of watchedDates.values()) {
    for (const date of dates) {
      if (sortKey === null || date > sortKey) sortKey = date;
    }
  }

  return {
    showId: tracked.tmdbShowId,
    showName: details.name,
    episode,
    backlogCount,
    badge,
    sortKey,
    seasons: meta.seasons,
    watchedEpisodes,
    skipCatchUpPrompt: tracked.skipCatchUpPrompt,
    initialStatus: tracked.status,
    tmdbStatus: details.status,
    cast: details.cast,
  };
}

export default async function TrackingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const trackedShows = await getMyShows('watching');
  const results = await Promise.all(
    trackedShows.map((tracked) => buildWatchListEntry(tracked))
  );

  const entries = results
    .filter((entry): entry is WatchListEntry => entry !== null)
    .sort((a, b) => {
      if (a.sortKey === null && b.sortKey === null) return 0;
      if (a.sortKey === null) return 1;
      if (b.sortKey === null) return -1;
      return b.sortKey.localeCompare(a.sortKey);
    });

  return (
    <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
      <main className="mx-auto w-full max-w-[950px] flex-1 px-5 py-10 md:px-0">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">
          Tracking
        </h1>

        {entries.length === 0 ? (
          <p className="text-sm text-[#8a9bab]">
            Nothing to watch right now — shows you&apos;re actively watching
            will show up here when a new episode is ready.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <WatchListRow
                key={entry.showId}
                showId={entry.showId}
                showName={entry.showName}
                episode={entry.episode}
                backlogCount={entry.backlogCount}
                badge={entry.badge}
                seasons={entry.seasons}
                watchedEpisodes={entry.watchedEpisodes}
                skipCatchUpPrompt={entry.skipCatchUpPrompt}
                initialStatus={entry.initialStatus}
                tmdbStatus={entry.tmdbStatus}
                cast={entry.cast}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
