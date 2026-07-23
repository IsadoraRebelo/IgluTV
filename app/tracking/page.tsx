import { redirect } from 'next/navigation';

import type { RecentWatchEntry, TrackingShow } from '@/components';
import {
  AccordionSection,
  buildUpcomingGroups,
  RecentlyWatchedAccordion,
  TrackingSidebarStats,
  TrackingStatsPills,
  TrackingTabs,
  TrackingUpcomingGroups,
  WatchListRow,
} from '@/components';
import { isOlderThanDays } from '@/components/ShowTracker/utils';

import { getCustomShowImages } from '@/services/custom-show-images';
import {
  getMyShows,
  getRecentWatchedEpisodes,
  getShowTracking,
  getTrackingRows,
  getWatchedEpisodesForShows,
} from '@/services/tracking';
import type { TrackingRow } from '@/services/tracking';
import {
  getTmdbEpisode,
  getTmdbSeasonEpisodes,
  getTmdbShowMeta,
} from '@/services/tv-shows';
import { getViewer } from '@/services/viewer';

import type {
  EpisodeWatch,
  LatestEpisode,
  SeasonEpisode,
  ShowStatus,
  ShowTracking,
} from '@/types';
import { mapWithConcurrency } from '@/utils';

const RECENT_WATCHED_LIMIT = 10;
const STALE_THRESHOLD_DAYS = 14;

type WatchListEntry = {
  showId: number;
  showName: string;
  posterUrl: string | null;
  network: string | null;
  episode: LatestEpisode;
  backlogCount: number;
  unwatchedRuntimeMinutes: number;
  sortKey: string | null;
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
  badge: 'new' | 'premiere' | null;
};

// tracking_rows' backlog_count includes the row's own next episode, but the
// row badge shows how many *more* are waiting beyond the one on screen.
function backlogBadgeCount(row: TrackingRow): number {
  return Math.max(0, row.backlogCount - 1);
}

type PosterOverrides = Awaited<ReturnType<typeof getCustomShowImages>>;

// Overlays a viewer's custom poster (show_tracking.custom_poster_url) onto a
// TMDB-sourced posterUrl, matching getCatalogueShows' own overlay exactly: a
// truthy check, not just `??`, so an override row with a null *or* empty
// string doesn't clobber the real poster.
function overlayPosterUrl(
  showId: number,
  posterUrl: string | null,
  overrides: PosterOverrides
): string | null {
  const override = overrides.get(showId);
  return override?.customPosterUrl ? override.customPosterUrl : posterUrl;
}

function toWatchListEntry(
  row: TrackingRow,
  tracked: ShowTracking,
  episode: LatestEpisode | null,
  watchedEpisodes: EpisodeWatch[],
  posterOverrides: PosterOverrides
): WatchListEntry | null {
  if (!episode) return null;

  return {
    showId: row.tmdbShowId,
    showName: row.name,
    posterUrl: overlayPosterUrl(row.tmdbShowId, row.posterUrl, posterOverrides),
    network: row.network,
    episode,
    backlogCount: backlogBadgeCount(row),
    unwatchedRuntimeMinutes: row.estimatedMinutes,
    sortKey: row.lastWatchedOn,
    watchedEpisodes,
    skipCatchUpPrompt: tracked.skipCatchUpPrompt,
    initialStatus: tracked.status,
    // Unknown until the episode modal lazily loads full show details
    // (ShowTrackingProvider.onLoadSeasons) — not used to render the row
    // itself, only inside the provider once seasons are loaded.
    tmdbStatus: null,
    badge: null,
  };
}

// Wishlist rows always show the first episode with no backlog badge,
// regardless of how many episodes have actually aired since — matching the
// old getFirstEpisode-based behaviour exactly.
function toWishlistEntry(
  row: TrackingRow,
  tracked: ShowTracking,
  episode: LatestEpisode | null,
  watchedEpisodes: EpisodeWatch[],
  posterOverrides: PosterOverrides
): WatchListEntry | null {
  if (!episode) return null;

  return {
    showId: row.tmdbShowId,
    showName: row.name,
    posterUrl: overlayPosterUrl(row.tmdbShowId, row.posterUrl, posterOverrides),
    network: row.network,
    episode,
    backlogCount: 0,
    unwatchedRuntimeMinutes: 0,
    sortKey: null,
    watchedEpisodes,
    skipCatchUpPrompt: tracked.skipCatchUpPrompt,
    initialStatus: tracked.status,
    tmdbStatus: null,
    badge: 'premiere',
  };
}

// Uncached caller of getTmdbSeasonEpisodes (which deliberately throws rather
// than degrading, so nothing bad gets cached — see its own comment) — same
// "degrade to null on failure" contract every other uncached TMDB wrapper in
// this file follows. Also degrades a technically-successful but empty
// response to null: a season that has a nextEpisode should never come back
// with zero episodes, so treat that as unusable rather than as "this show
// has no upcoming episodes" and let buildUpcomingGroups fall back to
// nextEpisode alone either way.
async function getUpcomingSeasonEpisodes(
  showId: number,
  seasonNumber: number
): Promise<SeasonEpisode[] | null> {
  try {
    const episodes = await getTmdbSeasonEpisodes(showId, seasonNumber);
    return episodes.length > 0 ? episodes : null;
  } catch (err) {
    console.warn('[tracking] upcoming season episodes fetch failed', err);
    return null;
  }
}

function formatRuntime(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Recently Watched needs two things per row, neither of which requires a
// season tree: the specific past episode being shown (getTmdbEpisode, one
// request) and the show's display fields (getTmdbShowMeta, one request —
// recentWatchedRows itself carries no name/poster/network, unlike
// TrackingRow). seasons/cast are left null/empty and load lazily when the
// episode modal opens, same as every other row on this page.
async function buildRecentWatchEntries(
  rows: {
    tmdbShowId: number;
    seasonNumber: number;
    episodeNumber: number;
    watchedOn: string;
  }[],
  watchedEpisodesByShow: Map<number, EpisodeWatch[]>,
  posterOverrides: PosterOverrides
): Promise<RecentWatchEntry[]> {
  const showIds = Array.from(new Set(rows.map((row) => row.tmdbShowId)));

  const [metas, trackings, episodes] = await Promise.all([
    mapWithConcurrency(showIds, 10, (showId) => getTmdbShowMeta(showId)),
    mapWithConcurrency(showIds, 10, (showId) => getShowTracking(showId)),
    mapWithConcurrency(rows, 10, (row) =>
      getTmdbEpisode(row.tmdbShowId, row.seasonNumber, row.episodeNumber)
    ),
  ]);
  const metaByShowId = new Map(showIds.map((showId, i) => [showId, metas[i]]));
  const trackingByShowId = new Map(
    showIds.map((showId, i) => [showId, trackings[i]])
  );

  const entries: RecentWatchEntry[] = [];
  rows.forEach((row, i) => {
    const episode = episodes[i];
    const meta = metaByShowId.get(row.tmdbShowId);
    if (!episode || !meta) return;

    const tracking = trackingByShowId.get(row.tmdbShowId);

    entries.push({
      showId: row.tmdbShowId,
      showName: meta.name,
      posterUrl: overlayPosterUrl(row.tmdbShowId, meta.posterUrl, posterOverrides),
      network: meta.network,
      episode,
      watchedOn: row.watchedOn,
      seasons: null,
      watchedEpisodes: watchedEpisodesByShow.get(row.tmdbShowId) ?? [],
      skipCatchUpPrompt: tracking?.skipCatchUpPrompt ?? false,
      initialStatus: tracking?.status ?? null,
      // Unknown until the episode modal lazily loads full show details —
      // matches toWatchListEntry's own tmdbStatus, and isn't used to render
      // the row itself, only inside the provider once seasons are loaded.
      tmdbStatus: null,
      cast: [],
    });
  });

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
      watchedEpisodes={entry.watchedEpisodes}
      skipCatchUpPrompt={entry.skipCatchUpPrompt}
      initialStatus={entry.initialStatus}
      tmdbStatus={entry.tmdbStatus}
    />
  );
}

export default async function TrackingPage() {
  const viewer = await getViewer();

  if (!viewer) redirect('/');

  const [trackedShows, wishlistShows, recentWatchedRows] = await Promise.all([
    getMyShows('watching'),
    getMyShows('watch_later'),
    getRecentWatchedEpisodes(RECENT_WATCHED_LIMIT),
  ]);

  const allShowIds = Array.from(
    new Set([
      ...trackedShows.map((tracked) => tracked.tmdbShowId),
      ...wishlistShows.map((tracked) => tracked.tmdbShowId),
      ...recentWatchedRows.map((row) => row.tmdbShowId),
    ])
  );
  // getCustomShowImages is one bulk query, fetched once for every show id
  // the page could possibly render, and overlaid wherever a posterUrl is
  // produced below (toWatchListEntry, toWishlistEntry,
  // buildRecentWatchEntries) — see overlayPosterUrl. Without this, the page
  // would show TMDB's default poster even for a show the viewer has set a
  // custom one for.
  const [watchedEpisodesByShow, posterOverrides] = await Promise.all([
    getWatchedEpisodesForShows(viewer.id, allShowIds),
    getCustomShowImages(viewer.id, allShowIds),
  ]);

  const trackedById = new Map(trackedShows.map((t) => [t.tmdbShowId, t]));
  const wishlistById = new Map(wishlistShows.map((t) => [t.tmdbShowId, t]));

  // One RPC covers every tracked show (watching + watch_later) that has a
  // backlog; a caught-up show is simply absent. One episode fetch per row,
  // bounded to 10 in flight, instead of a full-season fetch per show.
  const [trackingRows, recentWatchedEntries] = await Promise.all([
    getTrackingRows(viewer.id),
    buildRecentWatchEntries(
      recentWatchedRows,
      watchedEpisodesByShow,
      posterOverrides
    ),
  ]);

  const episodesByRow = await mapWithConcurrency(trackingRows, 10, (row) =>
    getTmdbEpisode(row.tmdbShowId, row.nextSeasonNumber, row.nextEpisodeNumber)
  );

  const entries: WatchListEntry[] = [];
  const wishlistCandidates: WatchListEntry[] = [];

  trackingRows.forEach((row, i) => {
    const episode = episodesByRow[i];
    const watchedEpisodes = watchedEpisodesByShow.get(row.tmdbShowId) ?? [];

    const tracked = trackedById.get(row.tmdbShowId);
    if (tracked) {
      const entry = toWatchListEntry(
        row,
        tracked,
        episode,
        watchedEpisodes,
        posterOverrides
      );
      if (entry) entries.push(entry);
      return;
    }

    const wishlistTracked = wishlistById.get(row.tmdbShowId);
    if (wishlistTracked) {
      const entry = toWishlistEntry(
        row,
        wishlistTracked,
        episode,
        watchedEpisodes,
        posterOverrides
      );
      if (entry) wishlistCandidates.push(entry);
    }
  });

  entries.sort((a, b) => {
    if (a.sortKey === null && b.sortKey === null) return 0;
    if (a.sortKey === null) return 1;
    if (b.sortKey === null) return -1;
    return b.sortKey.localeCompare(a.sortKey);
  });

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

  const wishlistEntries =
    staleEntries.length === 0
      ? wishlistCandidates
          .slice()
          .sort((a, b) => a.showName.localeCompare(b.showName))
      : [];

  const watchlistCount = wishlistShows.length;
  const watchlistHref = viewer.username
    ? `/profile/${viewer.username}/watchlist`
    : null;

  const totalEpisodesLeft = activeEntries.reduce(
    (sum, entry) => sum + entry.backlogCount + 1,
    0
  );
  const totalRuntimeMinutes = activeEntries.reduce(
    (sum, entry) => sum + entry.unwatchedRuntimeMinutes,
    0
  );
  const runtimeLabel = formatRuntime(totalRuntimeMinutes);

  // Upcoming is a much smaller, separate fetch: only the shows that made it
  // into the watchlist above, plus Recently Watched's shows, each needing
  // just its next-airing episode (getTmdbShowMeta, one request — no season
  // expansion) rather than a full season tree — but still bounded by
  // mapWithConcurrency, never a bare Promise.all fan-out.
  const upcomingMetas = await mapWithConcurrency(entries, 10, (entry) =>
    getTmdbShowMeta(entry.showId)
  );

  const trackingShowsById = new Map<number, TrackingShow>();
  entries.forEach((entry, i) => {
    const meta = upcomingMetas[i];
    trackingShowsById.set(entry.showId, {
      showId: entry.showId,
      showName: entry.showName,
      posterUrl: entry.posterUrl,
      network: entry.network,
      nextEpisode: meta?.nextEpisode ?? null,
      // Filled in below, bounded to shows that actually have a nextEpisode —
      // see the fan-out after this map is fully built.
      upcomingEpisodes: null,
      // Unknown until the episode modal lazily loads full show details —
      // matches toWatchListEntry's own seasons/tmdbStatus.
      seasons: null,
      watchedEpisodes: watchedEpisodesByShow.get(entry.showId) ?? [],
      skipCatchUpPrompt: entry.skipCatchUpPrompt,
      initialStatus: entry.initialStatus,
      tmdbStatus: null,
      cast: [],
    });
  });
  // Recently Watched's own shows may include ones not already covered
  // above (e.g. a show the viewer has fully caught up on, so it carries no
  // backlog and never made it into `entries`) — still fetched via
  // getTmdbShowMeta, bounded the same way. Next.js's request-scoped
  // memoization of 'use cache' calls means any show id already fetched
  // above costs no extra TMDB request here.
  const missingRecentWatchedEntries = recentWatchedEntries.filter(
    (entry) => !trackingShowsById.has(entry.showId)
  );
  const recentMetas = await mapWithConcurrency(
    missingRecentWatchedEntries,
    10,
    (entry) => getTmdbShowMeta(entry.showId)
  );
  missingRecentWatchedEntries.forEach((entry, i) => {
    const meta = recentMetas[i];
    trackingShowsById.set(entry.showId, {
      showId: entry.showId,
      showName: entry.showName,
      posterUrl: entry.posterUrl,
      network: entry.network,
      nextEpisode: meta?.nextEpisode ?? null,
      upcomingEpisodes: null,
      seasons: entry.seasons,
      watchedEpisodes: entry.watchedEpisodes,
      skipCatchUpPrompt: entry.skipCatchUpPrompt,
      initialStatus: entry.initialStatus,
      tmdbStatus: entry.tmdbStatus,
      cast: entry.cast,
    });
  });

  // A weekly show mid-season has more than one future-dated episode, but
  // fetching every season of every tracked show (the old behaviour) is
  // exactly the fan-out this rewrite removed. Instead, fetch just the
  // currently-airing season, and only for shows that actually have a
  // nextEpisode — in practice a small fraction of the page's shows, since
  // most tracked shows aren't currently airing anything.
  const showsWithNextEpisode = Array.from(trackingShowsById.values()).filter(
    (show): show is TrackingShow & { nextEpisode: LatestEpisode } =>
      show.nextEpisode !== null
  );
  const upcomingSeasonEpisodes = await mapWithConcurrency(
    showsWithNextEpisode,
    10,
    (show) =>
      getUpcomingSeasonEpisodes(show.showId, show.nextEpisode.seasonNumber)
  );
  showsWithNextEpisode.forEach((show, i) => {
    trackingShowsById.set(show.showId, {
      ...show,
      upcomingEpisodes: upcomingSeasonEpisodes[i],
    });
  });

  const upcomingGroups = buildUpcomingGroups(
    Array.from(trackingShowsById.values())
  );

  const sectionsContent = (
    <div>
      <RecentlyWatchedAccordion entries={recentWatchedEntries} />
      <AccordionSection title="Watch Next" defaultExpanded>
        {activeEntries.map(renderWatchListEntry)}
      </AccordionSection>
      {staleEntries.length > 0 ? (
        <AccordionSection title="Haven't Watched For A While" defaultExpanded>
          {staleEntries.map(renderWatchListEntry)}
        </AccordionSection>
      ) : wishlistEntries.length > 0 ? (
        <AccordionSection title="Start Next" defaultExpanded>
          {wishlistEntries.map(renderWatchListEntry)}
        </AccordionSection>
      ) : null}
    </div>
  );

  const sidebarStats = (
    <div className="hidden lg:block">
      <TrackingSidebarStats
        episodesLeft={totalEpisodesLeft}
        runtimeLabel={runtimeLabel}
        watchlistCount={watchlistCount}
        watchlistHref={watchlistHref}
      />
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      <main className="container-narrow flex-1 pb-5">
        <div className="mt-5">
          <TrackingTabs
            stats={
              <TrackingStatsPills
                episodesLeft={totalEpisodesLeft}
                runtimeLabel={runtimeLabel}
                watchlistCount={watchlistCount}
                watchlistHref={watchlistHref}
              />
            }
            toWatch={
              <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_260px]">
                {sectionsContent}
                {sidebarStats}
              </div>
            }
            upcoming={
              <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_260px]">
                <TrackingUpcomingGroups groups={upcomingGroups} />
                {sidebarStats}
              </div>
            }
          />
        </div>
      </main>
    </div>
  );
}
