import Image from 'next/image';
import { notFound } from 'next/navigation';

import { CastPageView, CastWatchProgress, ShowOverview } from '@/components';

import {
  getTmdbPersonDetails,
  getTmdbPersonTvCredits,
} from '@/services/person';
import {
  getShowsForUser,
  getWatchedEpisodeCountsForUser,
} from '@/services/tracking';
import { getViewerId } from '@/services/viewer';

export default async function CastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  if (Number.isNaN(numericId)) {
    notFound();
  }

  const [person, credits, userId] = await Promise.all([
    getTmdbPersonDetails(numericId),
    getTmdbPersonTvCredits(numericId),
    getViewerId(),
  ]);

  if (!person) {
    notFound();
  }

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
    <div className="flex flex-1 flex-col">
      <main className="container-narrow flex-1 pt-10 pb-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_260px]">
          <aside className="order-1 flex flex-col gap-4 lg:order-2">
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
                textSizeClassName="text-sm"
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
            <div>
              <p className="text-text-secondary text-xs font-semibold tracking-wide uppercase">
                TV Shows Starring
              </p>
              <h1 className="text-xl font-semibold text-white sm:text-3xl">
                {person.name}
              </h1>
            </div>

            <CastPageView credits={credits} watchedCounts={watchedCounts} />
          </div>
        </div>
      </main>
    </div>
  );
}
