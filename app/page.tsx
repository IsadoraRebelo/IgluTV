import { Suspense } from 'react';

import { HomeHero, RecoveryErrorToast, ShowCarouselRow } from '@/components';
import { RecommendedForYou } from '@/components/Home/RecommendedForYou';
import { RecommendedForYouSkeleton } from '@/components/Home/RecommendedForYouSkeleton';

import { getUserCountry } from '@/services/profile';
import {
  getPopularTvShowIdsForCountry,
  getTmdbShowFullDetails,
  getTrendingAnimeShowIds,
  getTrendingTvShowIds,
  pickShows,
  resolveShowSummaries,
} from '@/services/tv-shows';

import { getCountryDisplayName } from '@/utils';

export default async function Home() {
  const [trendingIds, animeIds, viewerCountry] = await Promise.all([
    getTrendingTvShowIds(),
    getTrendingAnimeShowIds(),
    getUserCountry(),
  ]);
  const country = viewerCountry ?? 'US';
  const popularIds = await getPopularTvShowIdsForCountry(country);

  const allShowIds = Array.from(
    new Set([...trendingIds, ...animeIds, ...popularIds])
  );
  const summaries = await resolveShowSummaries(allShowIds);

  const trendingShows = pickShows(trendingIds, summaries);
  const animeShows = pickShows(animeIds, summaries);
  const popularShows = pickShows(popularIds, summaries);

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
          <ShowCarouselRow
            title={`Popular in ${getCountryDisplayName(country) ?? country}`}
            shows={popularShows}
          />

          <Suspense fallback={<RecommendedForYouSkeleton />}>
            <RecommendedForYou />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
