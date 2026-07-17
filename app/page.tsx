import { Suspense } from 'react';

import { HomeHero, RecoveryErrorToast, ShowCarouselRow } from '@/components';
import {
  buildWatchedDatesMap,
  getEpisodeSectionState,
  getFirstEpisode,
  hasEpisodeAired,
} from '@/components/ShowTracker/utils';

import {
  getMyShows,
  getWatchedEpisodeCountsForUser,
  getWatchedEpisodesForShows,
} from '@/services/tracking';
import {
  getTmdbShowFullDetails,
  getTrendingAnimeShowIds,
  getTrendingTvShowIds,
  resolveShowSummaries,
} from '@/services/tv-shows';

import { createClient } from '@/supabase/server';

import type { EpisodeWatch, ShowSummary, ShowTracking } from '@/types';

async function getWatchNextShowIds(
  watchingShows: ShowTracking[],
  watchedEpisodesByShow: Map<number, EpisodeWatch[]>
): Promise<number[]> {
  const results = await Promise.all(
    watchingShows.map(async (tracked) => {
      let tmdbFull: Awaited<ReturnType<typeof getTmdbShowFullDetails>>;
      try {
        tmdbFull = await getTmdbShowFullDetails(tracked.tmdbShowId);
      } catch (err) {
        console.warn('[home] watch-next entry fetch failed', err);
        return null;
      }
      if (!tmdbFull) return null;

      const watchedEpisodes =
        watchedEpisodesByShow.get(tracked.tmdbShowId) ?? [];
      const watchedDates = buildWatchedDatesMap(watchedEpisodes);
      const section = getEpisodeSectionState(
        tmdbFull.meta,
        tmdbFull.details,
        watchedDates
      );

      if (section.kind === 'hidden' || section.kind === 'caught-up') {
        return null;
      }
      if (
        section.kind === 'next' &&
        !hasEpisodeAired(section.episode.airDate)
      ) {
        return null;
      }

      return tracked.tmdbShowId;
    })
  );

  return results.filter((id): id is number => id !== null);
}

async function getStartNextShowIds(
  wishlistShows: ShowTracking[]
): Promise<number[]> {
  const results = await Promise.all(
    wishlistShows.map(async (tracked) => {
      const tmdbFull = await getTmdbShowFullDetails(tracked.tmdbShowId);
      if (!tmdbFull) return null;

      const firstEpisode = getFirstEpisode(tmdbFull.meta.seasons);
      if (!firstEpisode || !hasEpisodeAired(firstEpisode.airDate)) {
        return null;
      }

      return tracked.tmdbShowId;
    })
  );

  return results.filter((id): id is number => id !== null);
}

function pickShows(
  ids: number[],
  summaries: Map<number, ShowSummary>
): ShowSummary[] {
  return ids
    .map((id) => summaries.get(id))
    .filter((show): show is ShowSummary => show !== undefined);
}

export default async function Home() {
  const supabase = await createClient();
  const [trendingIds, animeIds, userResult] = await Promise.all([
    getTrendingTvShowIds(),
    getTrendingAnimeShowIds(),
    supabase.auth.getUser(),
  ]);
  const userId = userResult.data.user?.id ?? null;

  const [watchingShows, wishlistShows]: [ShowTracking[], ShowTracking[]] =
    userId
      ? await Promise.all([getMyShows('watching'), getMyShows('watch_later')])
      : [[], []];

  const watchedEpisodesByShow = userId
    ? await getWatchedEpisodesForShows(
        userId,
        watchingShows.map((tracked) => tracked.tmdbShowId)
      )
    : new Map<number, EpisodeWatch[]>();

  const [watchNextIds, startNextIds] = await Promise.all([
    getWatchNextShowIds(watchingShows, watchedEpisodesByShow),
    getStartNextShowIds(wishlistShows),
  ]);

  const allShowIds = Array.from(
    new Set([...trendingIds, ...animeIds, ...watchNextIds, ...startNextIds])
  );
  const summaries = await resolveShowSummaries(allShowIds);

  const watchedCounts = userId
    ? await getWatchedEpisodeCountsForUser(userId, [
        ...watchNextIds,
        ...startNextIds,
      ])
    : new Map<number, number>();

  const trendingShows = pickShows(trendingIds, summaries);
  const animeShows = pickShows(animeIds, summaries);
  const watchNextShows = pickShows(watchNextIds, summaries);
  const startNextShows = pickShows(startNextIds, summaries);

  const heroBannerUrl = trendingShows[0]?.bannerUrl ?? null;

  return (
    <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
      <Suspense fallback={null}>
        <RecoveryErrorToast />
      </Suspense>

      <HomeHero bannerUrl={heroBannerUrl}>
        <div className="mx-auto w-full max-w-6xl px-4 md:px-15">
          <ShowCarouselRow title="Trending TV shows" shows={trendingShows} />
        </div>
      </HomeHero>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-20 md:px-15">
        <div className="flex flex-col gap-10">
          <ShowCarouselRow
            title="Watch Next"
            shows={watchNextShows}
            watchedCounts={watchedCounts}
            status="watching"
          />
          <ShowCarouselRow
            title="Start Next"
            shows={startNextShows}
            watchedCounts={watchedCounts}
            status="watch_later"
          />
          <ShowCarouselRow title="Trending Animes" shows={animeShows} />
        </div>
      </main>
    </div>
  );
}
