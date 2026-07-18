import { Suspense } from 'react';

import { HomeHero, RecoveryErrorToast, ShowCarouselRow } from '@/components';
import { PersonalizedShowRows } from '@/components/Home/PersonalizedShowRows';
import { PersonalizedShowRowsSkeleton } from '@/components/Home/PersonalizedShowRowsSkeleton';

import {
  getTmdbShowFullDetails,
  getTrendingAnimeShowIds,
  getTrendingTvShowIds,
  pickShows,
  resolveShowSummaries,
} from '@/services/tv-shows';

export default async function Home() {
  const [trendingIds, animeIds] = await Promise.all([
    getTrendingTvShowIds(),
    getTrendingAnimeShowIds(),
  ]);

  const allShowIds = Array.from(new Set([...trendingIds, ...animeIds]));
  const summaries = await resolveShowSummaries(allShowIds);

  const trendingShows = pickShows(trendingIds, summaries);
  const animeShows = pickShows(animeIds, summaries);

  const heroShow = trendingShows[0] ?? null;
  const heroDetails = heroShow
    ? await getTmdbShowFullDetails(heroShow.id)
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <RecoveryErrorToast />
      </Suspense>

      <HomeHero
        bannerUrl={heroShow?.bannerUrl ?? null}
        show={heroShow}
        overview={heroDetails?.details.overview ?? null}
      >
        <div className="container-shell">
          <ShowCarouselRow title="Trending TV shows" shows={trendingShows} />
        </div>
      </HomeHero>

      <main className="container-shell flex-1 pb-5">
        <div className="flex flex-col gap-5 md:gap-10">
          <ShowCarouselRow title="Trending Animes" shows={animeShows} />

          <Suspense fallback={<PersonalizedShowRowsSkeleton />}>
            <PersonalizedShowRows />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
