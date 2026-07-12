import { Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import {
  getFavouriteShowsForUser,
  getFinishedShowsForUser,
  getRecentWatchedShowsForUser,
  getShowsForUser,
  getWatchStatsForUser,
} from '@/services/tracking';
import { getProfileByUsername } from '@/services/profile';
import { getTmdbShowFullDetails } from '@/services/tv-shows';

import { createClient } from '@/supabase/server';

import { cn } from '@/utils';

const RECENT_ACTIVITY_LIMIT = 15;
const WATCHLIST_PREVIEW_LIMIT = 5;

type ShowSummary = {
  id: number;
  name: string;
  posterUrl: string | null;
  bannerUrl: string | null;
};

async function resolveShowSummaries(
  showIds: number[]
): Promise<Map<number, ShowSummary>> {
  const uniqueIds = Array.from(new Set(showIds));
  const results = await Promise.all(
    uniqueIds.map((id) => getTmdbShowFullDetails(id))
  );

  const map = new Map<number, ShowSummary>();
  uniqueIds.forEach((id, i) => {
    const full = results[i];
    if (!full) return;
    map.set(id, {
      id,
      name: full.details.name,
      posterUrl: full.details.posterUrl,
      bannerUrl: full.details.bannerUrl,
    });
  });
  return map;
}

function formatDiaryDate(dateStr: string): { month: string; day: string } {
  const date = new Date(`${dateStr}T00:00:00`);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
  };
}

type DiaryEntry = { show: ShowSummary; watchedOn: string };
type DiaryMonthGroup = { key: string; month: string; entries: DiaryEntry[] };

function groupDiaryEntriesByMonth(entries: DiaryEntry[]): DiaryMonthGroup[] {
  const groups: DiaryMonthGroup[] = [];

  for (const entry of entries) {
    const { month } = formatDiaryDate(entry.watchedOn);
    const date = new Date(`${entry.watchedOn}T00:00:00`);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.key === key) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({ key, month, entries: [entry] });
    }
  }

  return groups;
}

function PosterCard({
  show,
  caption,
  className,
}: {
  show: ShowSummary;
  caption?: string;
  className?: string;
}) {
  return (
    <Link href={`/show/${show.id}`} className={cn('flex flex-col gap-2', className)}>
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-[#2c3440]">
        {show.posterUrl ? (
          <Image
            src={show.posterUrl}
            alt={show.name}
            fill
            sizes="128px"
            className="object-cover"
          />
        ) : null}
      </div>
      {caption ? (
        <p className="truncate text-xs text-[#8a9bab]">{caption}</p>
      ) : null}
    </Link>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-white/[0.03] py-4 text-center">
      <span className="text-2xl font-semibold text-white">{value}</span>
      <span className="text-xs tracking-wide text-[#8a9bab] uppercase">
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

  const [stats, favouriteShows, watchlistShows, recentRows, finishedRows] =
    await Promise.all([
      getWatchStatsForUser(profile.id),
      getFavouriteShowsForUser(profile.id),
      getShowsForUser(profile.id, 'watch_later'),
      getRecentWatchedShowsForUser(profile.id, RECENT_ACTIVITY_LIMIT),
      getFinishedShowsForUser(profile.id),
    ]);

  const allShowIds = [
    ...favouriteShows.map((s) => s.tmdbShowId),
    ...watchlistShows.map((s) => s.tmdbShowId),
    ...recentRows.map((r) => r.tmdbShowId),
    ...finishedRows.map((r) => r.tmdbShowId),
  ];
  const summaries = await resolveShowSummaries(allShowIds);

  const favouriteSummaries = favouriteShows
    .map((s) => summaries.get(s.tmdbShowId))
    .filter((s): s is ShowSummary => s !== undefined);

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

  // Falls back to the banner of the most recently watched show when the
  // user hasn't set a custom one — recentActivity[0] is that show, since
  // recentRows is already ordered most-recently-watched first.
  const bannerUrl = profile.bannerUrl ?? recentActivity[0]?.show.bannerUrl ?? null;

  const finishedEntries = finishedRows
    .map((row) => {
      const show = summaries.get(row.tmdbShowId);
      if (!show) return null;
      return { show, watchedOn: row.watchedOn };
    })
    .filter((entry): entry is DiaryEntry => entry !== null);

  const diaryGroups = groupDiaryEntriesByMonth(finishedEntries);

  return (
    <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
      <div className="relative mx-auto w-full max-w-[950px] px-3 md:px-0">
        <div className="relative h-[140px] w-full overflow-hidden sm:h-[280px]">
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

          <div className="absolute bottom-0 left-0 flex items-start gap-4 p-4 md:p-6">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white/90 bg-[#2c3440] md:h-24 md:w-24">
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
            <div className="flex flex-col items-start gap-2">
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                {profile.username}
              </h1>
              {isOwner ? (
                <button
                  type="button"
                  disabled
                  className="w-fit rounded-full border-2 border-white px-5 py-1.5 text-xs font-bold tracking-widest text-white uppercase"
                >
                  Edit
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[950px] flex-1 px-3 pb-20 md:px-0">
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Shows" value={stats.totalShows} />
          <StatTile label="Episodes" value={stats.totalEpisodes} />
          <StatTile
            label="Shows this year"
            value={stats.showsThisYear}
          />
          <StatTile
            label="Episodes this year"
            value={stats.episodesThisYear}
          />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_260px]">
          <div className="flex min-w-0 flex-col gap-10">
            {favouriteSummaries.length > 0 ? (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-white">
                  Favourite Shows
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {favouriteSummaries.map((show) => (
                    <PosterCard key={show.id} show={show} className="w-full" />
                  ))}
                </div>
              </section>
            ) : null}

            {recentActivity.length > 0 ? (
              <section className="min-w-0">
                <h2 className="mb-4 text-lg font-semibold text-white">
                  Recent Activity
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {recentActivity.map((entry) => {
                    const { month, day } = formatDiaryDate(entry.watchedOn);
                    return (
                      <PosterCard
                        key={`${entry.show.id}-${entry.seasonNumber}-${entry.episodeNumber}`}
                        show={entry.show}
                        className="w-32 shrink-0"
                        caption={`S${String(entry.seasonNumber).padStart(2, '0')}E${String(entry.episodeNumber).padStart(2, '0')} · ${month} ${day}`}
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
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                    Watchlist
                  </h2>
                  <span className="text-sm text-[#8a9bab]">
                    {watchlistShows.length}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto">
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
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                    Diary
                  </h2>
                  <span className="text-sm text-[#8a9bab]">
                    {finishedRows.length}
                  </span>
                </div>
                <div className="mt-3 border-t border-white/10" />
                <div className="flex flex-col">
                  {diaryGroups.map((group, i) => (
                    <div key={group.key}>
                      <div className="flex gap-3 py-3">
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md bg-white/[0.06]">
                          <Calendar className="h-3.5 w-3.5 text-[#8a9bab]" />
                          <span className="text-[10px] font-semibold tracking-wide text-[#8a9bab] uppercase">
                            {group.month}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col justify-center gap-2">
                          {group.entries.map((entry) => {
                            const { day } = formatDiaryDate(entry.watchedOn);
                            return (
                              <Link
                                key={entry.show.id}
                                href={`/show/${entry.show.id}`}
                                className="flex items-baseline gap-3 text-sm"
                              >
                                <span className="w-5 shrink-0 text-[#8a9bab]">
                                  {day}
                                </span>
                                <span className="truncate text-white">
                                  {entry.show.name}
                                </span>
                              </Link>
                            );
                          })}
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
