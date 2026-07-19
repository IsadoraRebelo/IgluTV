import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/solid';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PosterCard, ProfileSettingsButton, StatTile } from '@/components';

import { getProfileByUsername } from '@/services/profile';
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
import { getViewerId } from '@/services/viewer';

import type { ShowSummary } from '@/types';

import {
  buildDiaryEntries,
  diaryEntryKey,
  diaryEntryLabel,
  formatDiaryDate,
  formatWatchDuration,
  groupDiaryEntriesByMonth,
} from '@/utils';

const RECENT_ACTIVITY_LIMIT = 15;
const WATCHLIST_PREVIEW_LIMIT = 5;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) {
    return { title: 'IgluTV' };
  }

  return {
    title: `${profile.username} - IgluTV`,
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const viewerId = await getViewerId();
  const isOwner = viewerId === profile.id;

  const [
    stats,
    favouriteShows,
    watchlistShows,
    recentRows,
    finishedRows,
    finishedSeasonRows,
    allTrackedShows,
  ] = await Promise.all([
    getWatchStatsForUser(profile.id),
    getFavouriteShowsForUser(profile.id),
    getShowsForUser(profile.id, 'watch_later'),
    getRecentWatchedShowsForUser(profile.id, RECENT_ACTIVITY_LIMIT),
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

  const bannerUrl =
    profile.bannerUrl ?? recentActivity[0]?.show.bannerUrl ?? null;

  const finishedEntries = buildDiaryEntries(
    finishedRows,
    finishedSeasonRows,
    summaries
  );

  const diaryGroups = groupDiaryEntriesByMonth(finishedEntries.slice(0, 10));

  return (
    <div className="flex flex-1 flex-col">
      <div className="container-wide relative">
        <div className="relative h-[250px] w-full overflow-hidden md:h-[350px]">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt=""
              fill
              sizes="(max-width: 950px) 100vw, 950px"
              priority
              className="object-cover object-top"
            />
          ) : null}
          <div className="from-background via-background/40 to-background/10 absolute inset-0 bg-gradient-to-t" />
          <div className="from-background to-background absolute inset-0 bg-gradient-to-r via-transparent" />
          {isOwner ? (
            <ProfileSettingsButton
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              bannerUrl={bannerUrl}
            />
          ) : null}
        </div>

        <div className="mt-[-70px] md:mt-[-50px] px-2 flex items-end md:px-15">
          <div className="border-accent-foreground bg-surface relative h-18 w-18 shrink-0 overflow-hidden rounded-full border-1 md:h-20 md:w-20">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.username}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
                {profile.username.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="z-50 mb-2 ml-3">
            <h1 className="text-lg font-bold text-white md:text-xl">
              {profile.username}
            </h1>
          </div>
        </div>
      </div>

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

        <div className="mt-5 md:mt-10 grid grid-cols-1 gap-5 md:gap-10 lg:grid-cols-[1fr_260px]">
          <div className="flex min-w-0 flex-col gap-5 md:gap-10">
            {favouriteShowSummaries.length > 0 ? (
              <section>
                <h2 className="border-muted-foreground text-white mb-2 md:mb-4 border-b px-1 pb-2 text-sm font-semibold">
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
                <h2 className="border-muted-foreground text-white mb-2 md:mb-4 border-b px-1 pb-2 text-sm font-semibold">
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
                <div className="text-white border-muted-foreground mb-2 md:mb-4 flex items-center justify-between border-b px-1 pb-2">
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

          <aside className="flex flex-col gap-5 md:gap-10 hidden md:flex">
            {watchlistSummaries.length > 0 ? (
              <div>
                <div className="text-white border-muted-foreground mb-2 flex items-center justify-between border-b px-1 pb-2">
                  <Link href={`/profile/${profile.username}/watchlist`} className="font-heading text-sm font-semibold hover:text-accent">WATCHLIST</Link>
                  <Link
                    href={`/profile/${profile.username}/watchlist`}
                    className="text-white hover:text-accent text-xs font-semibold tracking-wide uppercase"
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
                <div className="text-white border-muted-foreground mb-2 flex items-center justify-between border-b px-1 pb-2">
                  <Link href={`/profile/${profile.username}/diary`} className="font-heading text-sm font-semibold hover:text-accent">DIARY</Link>
                  <Link
                    href={`/profile/${profile.username}/diary`}
                    className="text-white hover:text-accent text-xs font-semibold tracking-wide uppercase"
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
                                    className="text-white hover:text-accent truncate text-sm font-semibold"
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
    </div>
  );
}
