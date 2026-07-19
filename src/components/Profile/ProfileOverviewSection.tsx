import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/solid';
import Image from 'next/image';
import Link from 'next/link';

import { PosterCard, StatTile } from '@/components';

import {
  getFavouriteShowsForUser,
  getFinishedSeasonsForUser,
  getFinishedShowsForUser,
  getRecentWatchedShowsForUser,
  getShowsForUser,
  getWatchedEpisodeCountsForUser,
  getWatchStatsForUser,
} from '@/services/tracking';
import { resolveShowSummaries } from '@/services/tv-shows';

import type { ShowSummary } from '@/types';

import {
  buildDiaryEntries,
  diaryEntryKey,
  diaryEntryLabel,
  formatDiaryDate,
  formatWatchDuration,
  groupDiaryEntriesByMonth,
} from '@/utils';

const WATCHLIST_PREVIEW_LIMIT = 5;

export async function ProfileOverviewSection({
  profile,
  recentRows,
}: {
  profile: { id: string; username: string };
  recentRows: Awaited<ReturnType<typeof getRecentWatchedShowsForUser>>;
}) {
  const [
    stats,
    favouriteShows,
    watchlistShows,
    finishedRows,
    finishedSeasonRows,
    allTrackedShows,
  ] = await Promise.all([
    getWatchStatsForUser(profile.id),
    getFavouriteShowsForUser(profile.id),
    getShowsForUser(profile.id, 'watch_later'),
    getFinishedShowsForUser(profile.id),
    getFinishedSeasonsForUser(profile.id),
    getShowsForUser(profile.id),
  ]);

  const statusByShowId = new Map(
    allTrackedShows.map((s) => [s.tmdbShowId, s.status])
  );

  const allShowIds = [
    ...favouriteShows.map((s) => s.tmdbShowId),
    ...watchlistShows.map((s) => s.tmdbShowId),
    ...recentRows.map((r) => r.tmdbShowId),
    ...finishedRows.map((r) => r.tmdbShowId),
    ...finishedSeasonRows.map((r) => r.tmdbShowId),
  ];
  const progressShowIds = Array.from(
    new Set([
      ...favouriteShows.map((s) => s.tmdbShowId),
      ...recentRows.map((r) => r.tmdbShowId),
    ])
  );

  const [summaries, watchedCounts] = await Promise.all([
    resolveShowSummaries(allShowIds),
    getWatchedEpisodeCountsForUser(profile.id, progressShowIds),
  ]);

  const favouriteSummaries = favouriteShows
    .map((s) => summaries.get(s.tmdbShowId))
    .filter((s): s is ShowSummary => s !== undefined);

  const favouriteShowSummaries = favouriteSummaries.filter((s) => !s.isAnime);
  const favouriteAnimeSummaries = favouriteSummaries.filter((s) => s.isAnime);

  const watchlistSummaries = watchlistShows
    .map((s) => summaries.get(s.tmdbShowId))
    .filter((s): s is ShowSummary => s !== undefined)
    .slice(0, WATCHLIST_PREVIEW_LIMIT);

  const recentActivity = recentRows
    .map((row) => {
      const show = summaries.get(row.tmdbShowId);
      if (!show) return null;
      return {
        show,
        seasonNumber: row.seasonNumber,
        episodeNumber: row.episodeNumber,
        watchedOn: row.watchedOn,
      };
    })
    .filter(
      (
        entry
      ): entry is {
        show: ShowSummary;
        seasonNumber: number;
        episodeNumber: number;
        watchedOn: string;
      } => entry !== null
    );

  const finishedEntries = buildDiaryEntries(
    finishedRows,
    finishedSeasonRows,
    summaries
  );

  const diaryGroups = groupDiaryEntriesByMonth(finishedEntries.slice(0, 10));

  return (
    <main className="container-shell flex-1 pb-5">
      <div className="mt-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={ClockIcon}
            label="Time Watching"
            value={formatWatchDuration(stats.totalWatchMinutes)}
          />
          <StatTile
            icon={ComputerDesktopIcon}
            label="Episodes"
            value={stats.totalEpisodes}
          />
          <StatTile
            icon={CalendarIcon}
            label="Episodes this year"
            value={stats.episodesThisYear}
          />
          <StatTile
            icon={CheckCircleIcon}
            label="Finished Shows"
            value={stats.finishedShowsCount}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:mt-10 md:gap-10 lg:grid-cols-[1fr_260px]">
        <div className="flex min-w-0 flex-col gap-5 md:gap-10">
          {favouriteShowSummaries.length > 0 ? (
            <section>
              <h2 className="border-muted-foreground mb-2 border-b px-1 pb-2 text-sm font-semibold text-white md:mb-4">
                FAVOURITE SHOWS
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {favouriteShowSummaries.map((show) => (
                  <PosterCard
                    key={show.id}
                    show={show}
                    className="w-full"
                    sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 155px"
                    progress={{
                      watchedCount: watchedCounts.get(show.id) ?? 0,
                      showStatus: statusByShowId.get(show.id) ?? null,
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {favouriteAnimeSummaries.length > 0 ? (
            <section>
              <h2 className="border-muted-foreground mb-2 border-b px-1 pb-2 text-sm font-semibold text-white md:mb-4">
                FAVOURITE ANIME
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {favouriteAnimeSummaries.map((show) => (
                  <PosterCard
                    key={show.id}
                    show={show}
                    className="w-full"
                    sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 155px"
                    progress={{
                      watchedCount: watchedCounts.get(show.id) ?? 0,
                      showStatus: statusByShowId.get(show.id) ?? null,
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {recentActivity.length > 0 ? (
            <section className="min-w-0">
              <div className="border-muted-foreground mb-2 flex items-center justify-between border-b px-1 pb-2 text-white md:mb-4">
                <h2 className="text-sm font-semibold">MY SHOWS</h2>
                <Link
                  href={`/profile/${profile.username}/shows`}
                  className="hover:text-accent text-xs font-semibold tracking-wide uppercase"
                >
                  All
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {recentActivity.map((entry) => {
                  const { month, day } = formatDiaryDate(entry.watchedOn);
                  return (
                    <PosterCard
                      key={`${entry.show.id}-${entry.seasonNumber}-${entry.episodeNumber}`}
                      show={entry.show}
                      className="w-32 shrink-0"
                      caption={`S${String(entry.seasonNumber).padStart(2, '0')}E${String(entry.episodeNumber).padStart(2, '0')} · ${month} ${day}`}
                      progress={{
                        watchedCount: watchedCounts.get(entry.show.id) ?? 0,
                        showStatus: statusByShowId.get(entry.show.id) ?? null,
                      }}
                    />
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="flex hidden flex-col gap-5 md:flex md:gap-10">
          {watchlistSummaries.length > 0 ? (
            <div>
              <div className="border-muted-foreground mb-2 flex items-center justify-between border-b px-1 pb-2 text-white">
                <Link
                  href={`/profile/${profile.username}/watchlist`}
                  className="font-heading hover:text-accent text-sm font-semibold"
                >
                  WATCHLIST
                </Link>
                <Link
                  href={`/profile/${profile.username}/watchlist`}
                  className="hover:text-accent text-xs font-semibold tracking-wide text-white uppercase"
                >
                  {watchlistShows.length}
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto pt-2">
                {watchlistSummaries.map((show) => (
                  <Link
                    key={show.id}
                    href={`/show/${show.id}`}
                    className="bg-surface relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-md"
                  >
                    {show.posterUrl ? (
                      <Image
                        src={show.posterUrl}
                        alt={show.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {finishedEntries.length > 0 ? (
            <div>
              <div className="border-muted-foreground mb-2 flex items-center justify-between border-b px-1 pb-2 text-white">
                <Link
                  href={`/profile/${profile.username}/diary`}
                  className="font-heading hover:text-accent text-sm font-semibold"
                >
                  DIARY
                </Link>
                <Link
                  href={`/profile/${profile.username}/diary`}
                  className="hover:text-accent text-xs font-semibold tracking-wide text-white uppercase"
                >
                  {finishedEntries.length}
                </Link>
              </div>
              <div className="flex flex-col">
                {diaryGroups.map((group, i) => (
                  <div key={group.key}>
                    <div className="flex items-start gap-3 py-3">
                      <div className="shrink-0 rounded-md bg-white/[0.06] px-3 pb-1">
                        <span className="text-text-secondary text-[10px] font-bold tracking-wide uppercase">
                          {group.month}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-2">
                        {group.days.map((dayGroup) => (
                          <div key={dayGroup.day} className="flex gap-2">
                            <span className="text-accent-foreground shrink-0 text-sm">
                              {dayGroup.day}
                            </span>
                            <div className="flex min-w-0 flex-col gap-1">
                              {dayGroup.entries.map((entry) => (
                                <Link
                                  key={diaryEntryKey(entry)}
                                  href={`/show/${entry.show.id}`}
                                  className="hover:text-accent truncate text-sm font-semibold text-white"
                                >
                                  {diaryEntryLabel(entry)}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {i < diaryGroups.length - 1 ? (
                      <div className="border-t border-white/10" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
