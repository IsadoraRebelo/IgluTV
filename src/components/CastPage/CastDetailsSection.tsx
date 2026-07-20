import Image from 'next/image';

import { CastPageView, CastWatchProgress, ShowOverview } from '@/components';

import {
  getShowsForUser,
  getWatchedEpisodeCountsForUser,
} from '@/services/tracking';
import { getTmdbPersonTvCredits } from '@/services/person';
import { getViewerId } from '@/services/viewer';

import type { PersonDetails } from '@/types';

export async function CastDetailsSection({
  numericId,
  person,
}: {
  numericId: number;
  person: PersonDetails;
}) {
  const [credits, userId] = await Promise.all([
    getTmdbPersonTvCredits(numericId),
    getViewerId(),
  ]);

  let watchedCounts: Map<number, number> | null = null;
  let completedShowIds: Set<number> | null = null;
  if (userId) {
    [watchedCounts, completedShowIds] = await Promise.all([
      getWatchedEpisodeCountsForUser(
        userId,
        credits.map((credit) => credit.showId)
      ),
      getShowsForUser(userId, 'completed').then(
        (shows) => new Set(shows.map((show) => show.tmdbShowId))
      ),
    ]);
  }

  const watchedShowCount = completedShowIds
    ? credits.filter((credit) => completedShowIds.has(credit.showId)).length
    : 0;

  return (
    <>
      <div className="container-shell relative z-10 -mt-24 flex flex-col gap-2 pb-2 md:hidden">
        <div>
          <p className="text-text-secondary text-[10px] font-semibold tracking-wide uppercase">
            TV Shows Starring
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {person.name}
          </h1>
        </div>
        {person.biography ? (
          <ShowOverview text={person.biography} marginTopClassName="mt-0" />
        ) : null}
        {watchedCounts ? (
          <div className="mt-2">
            <CastWatchProgress
              watchedCount={watchedShowCount}
              totalCount={credits.length}
            />
          </div>
        ) : null}
        <a
          href={`https://www.themoviedb.org/person/${numericId}`}
          target="_blank"
          rel="noreferrer"
          className="text-text-primary mt-2 w-fit rounded-md bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
        >
          More details at TMDB
        </a>
      </div>

      <main className="container-shell flex-1 pt-5 md:pt-10 pb-5">
        <div className="grid grid-cols-1 gap-7 md:gap-10 lg:grid-cols-[1fr_260px]">
          <aside className="order-1 hidden flex-col gap-4 md:flex lg:order-2">
            <div className="bg-surface relative aspect-[3/4] w-full max-w-[230px] overflow-hidden rounded-sm">
              {person.profileUrl ? (
                <Image
                  src={person.profileUrl}
                  alt={person.name}
                  fill
                  sizes="230px"
                  className="object-cover"
                />
              ) : null}
            </div>
            {person.biography ? (
              <ShowOverview
                text={person.biography}
                marginTopClassName="mt-0"
              />
            ) : null}
            <a
              href={`https://www.themoviedb.org/person/${numericId}`}
              target="_blank"
              rel="noreferrer"
              className="text-text-primary w-fit rounded-md bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
            >
              More details at TMDB
            </a>
            {watchedCounts ? (
              <CastWatchProgress
                watchedCount={watchedShowCount}
                totalCount={credits.length}
              />
            ) : null}
          </aside>

          <div className="order-2 flex flex-col gap-5 lg:order-1">
            <div className="hidden md:block">
              <p className="text-text-secondary text-xs font-semibold tracking-wide uppercase">
                TV Shows Starring
              </p>
              <h1 className="text-xl font-semibold text-white sm:text-2xl">
                {person.name}
              </h1>
            </div>

            <CastPageView credits={credits} watchedCounts={watchedCounts} />
          </div>
        </div>
      </main>
    </>
  );
}
