import { Suspense } from 'react';

import {
  AuthButton,
  RecoveryErrorToast,
  TvShowCard,
  WatchListLink,
} from '@/components';

import { getPopularTvShows } from '@/services/tv-shows';

export default async function Home() {
  const shows = await getPopularTvShows();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <Suspense fallback={null}>
        <RecoveryErrorToast />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:px-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Popular TV Shows
          </h1>
          <div className="flex items-center gap-4">
            <WatchListLink />
            <AuthButton />
          </div>
        </div>

        {shows.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            No TV shows to show right now.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
            {shows.map((show) => (
              <TvShowCard key={show.id} show={show} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
