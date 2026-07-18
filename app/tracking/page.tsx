import { BookmarkIcon, ClockIcon, FilmIcon } from '@heroicons/react/24/solid';
import { redirect } from 'next/navigation';

import type { RecentWatchEntry } from '@/components';
import {
  AccordionSection,
  RecentlyWatchedAccordion,
  WatchListRow,
} from '@/components';
import {
  buildWatchedDatesMap,
  getEpisodeSectionState,
  getFirstEpisode,
  getPriorUnwatchedAiredEpisodes,
  hasEpisodeAired,
  isOlderThanDays,
} from '@/components/ShowTracker/utils';

import {
  getMyShows,
  getRecentWatchedEpisodes,
  getShowTracking,
  getWatchedEpisodesForShows,
} from '@/services/tracking';
import { getTmdbShowFullDetails } from '@/services/tv-shows';
import { getViewer } from '@/services/viewer';

import type {
  CastMember,
  EpisodeWatch,
  LatestEpisode,
  Season,
  ShowStatus,
  ShowTracking,
} from '@/types';

const RECENT_WATCHED_LIMIT = 10;
const STALE_THRESHOLD_DAYS = 14;

type WatchListEntry = {
  showId: number;
  showName: string;
  posterUrl: string | null;
  episode: LatestEpisode;
  backlogCount: number;
  unwatchedRuntimeMinutes: number;
  sortKey: string | null;
  seasons: Season[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
  cast: CastMember[];
  badge: 'new' | 'premiere' | null;
};

async function buildWatchListEntry(
  tracked: ShowTracking,
  watchedEpisodes: EpisodeWatch[]
): Promise<WatchListEntry | null> {
  let tmdbFull: Awaited<ReturnType<typeof getTmdbShowFullDetails>>;
  try {
    tmdbFull = await getTmdbShowFullDetails(tracked.tmdbShowId);
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
  const backlogRefs =
    section.kind === 'next'
      ? getPriorUnwatchedAiredEpisodes(
          meta.seasons,
          watchedDates,
          episode.seasonNumber,
          episode.episodeNumber
        )
      : [];
  const backlogCount = backlogRefs.length;
  const unwatchedRuntimeMinutes =
    backlogRefs.reduce((sum, ref) => {
      const backlogEpisode = findEpisode(
        meta.seasons,
        ref.seasonNumber,
        ref.episodeNumber
      );
      return sum + (backlogEpisode?.runtime ?? 0);
    }, 0) + (episode.runtime ?? 0);

  let sortKey: string | null = null;
  for (const dates of watchedDates.values()) {
    for (const date of dates) {
      if (date === null) continue;
      if (sortKey === null || date > sortKey) sortKey = date;
    }
  }

  return {
    showId: tracked.tmdbShowId,
    showName: details.name,
    posterUrl: details.posterUrl,
    episode,
    backlogCount,
    unwatchedRuntimeMinutes,
    sortKey,
    seasons: meta.seasons,
    watchedEpisodes,
    skipCatchUpPrompt: tracked.skipCatchUpPrompt,
    initialStatus: tracked.status,
    tmdbStatus: details.status,
    cast: details.cast,
    badge: null,
  };
}

type ShowBundle = {
  showName: string;
  seasons: Season[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
  cast: CastMember[];
};

async function buildShowBundle(
  showId: number,
  watchedEpisodes: EpisodeWatch[]
): Promise<ShowBundle | null> {
  try {
    const [tmdbFull, tracking] = await Promise.all([
      getTmdbShowFullDetails(showId),
      getShowTracking(showId),
    ]);
    if (!tmdbFull) return null;

    const { details, meta } = tmdbFull;
    return {
      showName: details.name,
      seasons: meta.seasons,
      watchedEpisodes,
      skipCatchUpPrompt: tracking?.skipCatchUpPrompt ?? false,
      initialStatus: tracking?.status ?? null,
      tmdbStatus: details.status,
      cast: details.cast,
    };
  } catch (err) {
    console.warn('[tracking] recent watch show fetch failed', err);
    return null;
  }
}

function findEpisode(
  seasons: Season[],
  seasonNumber: number,
  episodeNumber: number
): LatestEpisode | null {
  const season = seasons.find((s) => s.seasonNumber === seasonNumber);
  const episode = season?.episodes.find(
    (ep) => ep.episodeNumber === episodeNumber
  );
  if (!season || !episode) return null;

  return {
    name: episode.name,
    overview: episode.overview,
    seasonNumber,
    episodeNumber,
    airDate: episode.airDate,
    runtime: episode.runtime,
    imageUrl: episode.imageUrl,
  };
}

function formatRuntime(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

async function buildWishlistEntry(
  tracked: ShowTracking,
  watchedEpisodes: EpisodeWatch[]
): Promise<WatchListEntry | null> {
  let tmdbFull: Awaited<ReturnType<typeof getTmdbShowFullDetails>>;
  try {
    tmdbFull = await getTmdbShowFullDetails(tracked.tmdbShowId);
  } catch (err) {
    console.warn('[tracking] wishlist entry fetch failed', err);
    return null;
  }
  if (!tmdbFull) return null;

  const { details, meta } = tmdbFull;
  const episode = getFirstEpisode(meta.seasons);
  if (!episode || !hasEpisodeAired(episode.airDate)) return null;

  return {
    showId: tracked.tmdbShowId,
    showName: details.name,
    posterUrl: details.posterUrl,
    episode,
    backlogCount: 0,
    unwatchedRuntimeMinutes: 0,
    sortKey: null,
    seasons: meta.seasons,
    watchedEpisodes,
    skipCatchUpPrompt: tracked.skipCatchUpPrompt,
    initialStatus: tracked.status,
    tmdbStatus: details.status,
    cast: details.cast,
    badge: 'premiere',
  };
}

async function buildRecentWatchEntries(
  rows: {
    tmdbShowId: number;
    seasonNumber: number;
    episodeNumber: number;
    watchedOn: string;
  }[],
  watchedEpisodesByShow: Map<number, EpisodeWatch[]>
): Promise<RecentWatchEntry[]> {
  const showIds = Array.from(new Set(rows.map((row) => row.tmdbShowId)));
  const bundles = await Promise.all(
    showIds.map((showId) =>
      buildShowBundle(showId, watchedEpisodesByShow.get(showId) ?? [])
    )
  );
  const bundleByShowId = new Map(
    showIds.map((showId, i) => [showId, bundles[i]])
  );

  const entries: RecentWatchEntry[] = [];
  for (const row of rows) {
    const bundle = bundleByShowId.get(row.tmdbShowId);
    if (!bundle) continue;

    const episode = findEpisode(
      bundle.seasons,
      row.seasonNumber,
      row.episodeNumber
    );
    if (!episode) continue;

    entries.push({
      showId: row.tmdbShowId,
      showName: bundle.showName,
      episode,
      watchedOn: row.watchedOn,
      seasons: bundle.seasons,
      watchedEpisodes: bundle.watchedEpisodes,
      skipCatchUpPrompt: bundle.skipCatchUpPrompt,
      initialStatus: bundle.initialStatus,
      tmdbStatus: bundle.tmdbStatus,
      cast: bundle.cast,
    });
  }

  return entries.reverse();
}

function renderWatchListEntry(entry: WatchListEntry) {
  return (
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
  );
}

export default async function TrackingPage() {
  const viewer = await getViewer();

  if (!viewer) redirect('/');

  const trackedShows = await getMyShows('watching');
  const wishlistShows = await getMyShows('watch_later');
  const recentWatchedRows =
    await getRecentWatchedEpisodes(RECENT_WATCHED_LIMIT);

  const allShowIds = Array.from(
    new Set([
      ...trackedShows.map((tracked) => tracked.tmdbShowId),
      ...wishlistShows.map((tracked) => tracked.tmdbShowId),
      ...recentWatchedRows.map((row) => row.tmdbShowId),
    ])
  );
  const watchedEpisodesByShow = await getWatchedEpisodesForShows(
    viewer.id,
    allShowIds
  );

  const results = await Promise.all(
    trackedShows.map((tracked) =>
      buildWatchListEntry(
        tracked,
        watchedEpisodesByShow.get(tracked.tmdbShowId) ?? []
      )
    )
  );

  const entries = results
    .filter((entry): entry is WatchListEntry => entry !== null)
    .sort((a, b) => {
      if (a.sortKey === null && b.sortKey === null) return 0;
      if (a.sortKey === null) return 1;
      if (b.sortKey === null) return -1;
      return b.sortKey.localeCompare(a.sortKey);
    });

  const recentWatchedEntries = await buildRecentWatchEntries(
    recentWatchedRows,
    watchedEpisodesByShow
  );

  const staleShowIds = new Set(
    entries
      .filter(
        (entry) =>
          entry.sortKey !== null &&
          isOlderThanDays(entry.sortKey, STALE_THRESHOLD_DAYS) &&
          entry.episode.airDate !== null &&
          isOlderThanDays(entry.episode.airDate, STALE_THRESHOLD_DAYS)
      )
      .map((entry) => entry.showId)
  );
  const activeEntries = entries.filter(
    (entry) => !staleShowIds.has(entry.showId)
  );
  const staleEntries = entries.filter((entry) =>
    staleShowIds.has(entry.showId)
  );

  let wishlistEntries: WatchListEntry[] = [];
  if (staleEntries.length === 0) {
    const wishlistResults = await Promise.all(
      wishlistShows.map((tracked) =>
        buildWishlistEntry(
          tracked,
          watchedEpisodesByShow.get(tracked.tmdbShowId) ?? []
        )
      )
    );
    wishlistEntries = wishlistResults
      .filter((entry): entry is WatchListEntry => entry !== null)
      .sort((a, b) => a.showName.localeCompare(b.showName));
  }

  const watchlistCount = wishlistShows.length;

  const totalEpisodesLeft = activeEntries.reduce(
    (sum, entry) => sum + entry.backlogCount + 1,
    0
  );
  const totalRuntimeMinutes = activeEntries.reduce(
    (sum, entry) => sum + entry.unwatchedRuntimeMinutes,
    0
  );

  return (
    <div className="flex flex-1 flex-col">
      <main className="container-narrow flex-1 pb-20">
        <div className="mt-5 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_260px]">
          <div>
            <RecentlyWatchedAccordion entries={recentWatchedEntries} />
            <AccordionSection title="Watch Next" defaultExpanded>
              {activeEntries.map(renderWatchListEntry)}
            </AccordionSection>
            {staleEntries.length > 0 ? (
              <AccordionSection
                title="Haven't Watched For A While"
                defaultExpanded
              >
                {staleEntries.map(renderWatchListEntry)}
              </AccordionSection>
            ) : wishlistEntries.length > 0 ? (
              <AccordionSection title="Start Next" defaultExpanded>
                {wishlistEntries.map(renderWatchListEntry)}
              </AccordionSection>
            ) : null}
          </div>

          <aside className="hidden h-fit flex-col gap-1 rounded-lg bg-white/[0.03] p-2 lg:flex">
            <div className="text-foreground flex items-center gap-2 rounded-md px-3 py-2.5 text-sm">
              <FilmIcon className="h-4 w-4 shrink-0" />
              <span>
                {totalEpisodesLeft} episode{totalEpisodesLeft === 1 ? '' : 's'}{' '}
                to watch
              </span>
            </div>
            <div className="text-foreground flex items-center gap-2 rounded-md px-3 py-2.5 text-sm">
              <ClockIcon className="h-4 w-4 shrink-0" />
              <span>{formatRuntime(totalRuntimeMinutes)} to catch up</span>
            </div>
            <div className="text-foreground flex items-center gap-2 rounded-md px-3 py-2.5 text-sm">
              <BookmarkIcon className="h-4 w-4 shrink-0" />
              <span>
                {watchlistCount} show{watchlistCount === 1 ? '' : 's'} on
                watchlist
              </span>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
