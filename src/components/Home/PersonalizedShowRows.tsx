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
  pickShows,
  resolveShowSummaries,
} from '@/services/tv-shows';
import { getViewerId } from '@/services/viewer';

import type { EpisodeWatch, ShowTracking } from '@/types';

import { ShowCarouselRow } from './ShowCarouselRow';

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

export async function PersonalizedShowRows() {
  const userId = await getViewerId();
  if (!userId) return null;

  const [watchingShows, wishlistShows]: [ShowTracking[], ShowTracking[]] =
    await Promise.all([getMyShows('watching'), getMyShows('watch_later')]);

  const watchedEpisodesByShow = await getWatchedEpisodesForShows(
    userId,
    watchingShows.map((tracked) => tracked.tmdbShowId)
  );

  const [watchNextIds, startNextIds] = await Promise.all([
    getWatchNextShowIds(watchingShows, watchedEpisodesByShow),
    getStartNextShowIds(wishlistShows),
  ]);

  const allShowIds = Array.from(new Set([...watchNextIds, ...startNextIds]));
  const summaries = await resolveShowSummaries(allShowIds);

  const watchedCounts = await getWatchedEpisodeCountsForUser(userId, [
    ...watchNextIds,
    ...startNextIds,
  ]);

  const watchNextShows = pickShows(watchNextIds, summaries);
  const startNextShows = pickShows(startNextIds, summaries);

  return (
    <>
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
    </>
  );
}
