import Image from 'next/image';
import Link from 'next/link';

import { PosterCard, ProfileSettingsButton } from '@/components';

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

import { createClient } from '@/supabase/server';

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

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center rounded-md bg-white/[0.03] py-3 text-center">
      <span className="text-accent text-2xl font-semibold">{value}</span>
      <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}

function ProfileNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#14181c] px-6 py-24 text-center">
      <p className="text-[#9ab0bf]">Profile not found.</p>
      <Link
        href="/"
        className="mt-4 text-sm text-[#678] underline hover:text-[#9ab0bf]"
      >
        Back to home
      </Link>
    </div>
  );
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) return <ProfileNotFound />;

  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const isOwner = viewer?.id === profile.id;

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
    <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
      <div className="relative mx-auto w-full max-w-6xl px-3 md:px-0">
        <div className="relative h-[140px] w-full overflow-hidden sm:h-[350px]">
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/40 to-[#14181c]/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#14181c] via-transparent to-[#14181c]" />
          {isOwner ? (
            <ProfileSettingsButton
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              bannerUrl={bannerUrl}
            />
          ) : null}
        </div>

        <div className="mt-[-50px] ml-2 flex items-end md:ml-24">
          <div className="border-accent-foreground relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-1 bg-[#2c3440] md:h-20 md:w-20">
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

      <main className="mx-auto w-full max-w-[950px] flex-1 px-3 pb-20 md:px-0">
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            label="Time Watching"
            value={formatWatchDuration(stats.totalWatchMinutes)}
          />
          <StatTile label="Episodes" value={stats.totalEpisodes} />
          <StatTile label="Episodes this year" value={stats.episodesThisYear} />
          <StatTile label="Finished Shows" value={stats.finishedShowsCount} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_260px]">
          <div className="flex min-w-0 flex-col gap-10">
            {favouriteShowSummaries.length > 0 ? (
              <section>
                <h2 className="border-muted-foreground px-1 text-muted-foreground mb-4 border-b pb-2 text-sm font-semibold">
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
                <h2 className="border-muted-foreground px-1 text-muted-foreground mb-4 border-b pb-2 text-sm font-semibold">
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
                <div className="flex items-center px-1 justify-between mb-4 border-b pb-2 text-muted-foreground border-muted-foreground">
                  <h2 className="text-sm font-semibold">
                    RECENT ACTIVITY
                  </h2>
                  <Link
                    href={`/profile/${profile.username}/shows`}
                    className="text-xs font-semibold tracking-wide uppercase hover:text-accent"
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

          <aside className="flex flex-col gap-8">
            {watchlistSummaries.length > 0 ? (
              <div>
                <div className="flex items-center px-1 justify-between">
                  <Link
                    href={`/profile/${profile.username}/watchlist`}
                    className="text-muted-foreground text-sm font-semibold tracking-wide uppercase hover:text-accent"
                  >
                    Watchlist
                  </Link>
                  <Link
                    href={`/profile/${profile.username}/watchlist`}
                    className="text-muted-foreground text-xs font-semibold tracking-wide uppercase hover:text-accent"
                  >
                    {watchlistShows.length}
                  </Link>
                </div>
                <div className="border-muted-foreground mt-1 flex gap-2 overflow-x-auto border-t pt-3">
                  {watchlistSummaries.map((show) => (
                    <Link
                      key={show.id}
                      href={`/show/${show.id}`}
                      className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-md bg-[#2c3440]"
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
                <div className="flex items-center justify-between py-1">
                  <Link
                    href={`/profile/${profile.username}/diary`}
                    className="text-muted-foreground text-sm font-semibold tracking-wide uppercase hover:text-accent"
                  >
                    Diary
                  </Link>
                  <Link
                    href={`/profile/${profile.username}/diary`}
                    className="text-muted-foreground text-xs font-semibold tracking-wide uppercase hover:text-accent"
                  >
                    {finishedEntries.length}
                  </Link>
                </div>
                <div className="border-muted-foreground mt-1 border-t" />
                <div className="flex flex-col">
                  {diaryGroups.map((group, i) => (
                    <div key={group.key}>
                      <div className="flex items-start gap-3 py-3">
                        <div className="shrink-0 rounded-md bg-white/[0.06] px-3 pb-1">
                          <span className="text-[10px] font-bold tracking-wide text-[#8a9bab] uppercase">
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
                                    className="text-muted-foreground truncate text-sm font-semibold hover:text-accent"
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
