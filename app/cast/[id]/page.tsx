import Image from 'next/image';
import Link from 'next/link';

import { CastPageView, CastWatchProgress, ShowOverview } from '@/components';

import {
  getTmdbPersonDetails,
  getTmdbPersonTvCredits,
} from '@/services/person';
import { getWatchedEpisodeCountsForUser } from '@/services/tracking';

import { createClient } from '@/supabase/server';

export default async function CastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  if (Number.isNaN(numericId)) {
    return <PersonNotFound />;
  }

  const supabase = await createClient();
  const [person, credits, userResult] = await Promise.all([
    getTmdbPersonDetails(numericId),
    getTmdbPersonTvCredits(numericId),
    supabase.auth.getUser(),
  ]);

  if (!person) {
    return <PersonNotFound />;
  }

  const userId = userResult.data.user?.id ?? null;

  let watchedCounts: Map<number, number> | null = null;
  if (userId) {
    watchedCounts = await getWatchedEpisodeCountsForUser(
      userId,
      credits.map((credit) => credit.showId)
    );
  }

  const watchedShowCount = watchedCounts
    ? credits.filter((credit) => (watchedCounts.get(credit.showId) ?? 0) > 0)
        .length
    : 0;

  return (
    <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
      <main className="mx-auto w-full max-w-[950px] flex-1 px-3 pt-10 pb-20 md:px-0">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_260px]">
          <aside className="order-1 flex flex-col gap-4 lg:order-2">
            <div className="relative aspect-[3/4] w-full max-w-[230px] overflow-hidden rounded-md bg-[#2c3440]">
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
            {person.biography ? <ShowOverview text={person.biography} /> : null}
            <a
              href={`https://www.themoviedb.org/person/${numericId}`}
              target="_blank"
              rel="noreferrer"
              className="w-fit rounded-md bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#c2d0dd] hover:bg-white/10"
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

          <div className="order-2 flex flex-col gap-6 lg:order-1">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#8a9bab] uppercase">
                TV Shows Starring
              </p>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">
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

function PersonNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#14181c] px-6 py-24 text-center">
      <p className="text-[#9ab0bf]">Person not found.</p>
      <Link
        href="/"
        className="mt-4 text-sm text-[#678] underline hover:text-[#9ab0bf]"
      >
        Back to home
      </Link>
    </div>
  );
}
