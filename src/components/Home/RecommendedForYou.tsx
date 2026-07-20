import { getRecommendedShowIdsForUser } from '@/services/recommendations';
import { pickShows, resolveShowSummaries } from '@/services/tv-shows';
import { getViewerId } from '@/services/viewer';

import { ShowCarouselRow } from './ShowCarouselRow';

export async function RecommendedForYou() {
  const userId = await getViewerId();
  if (!userId) return null;

  const recommendedIds = await getRecommendedShowIdsForUser(userId);
  if (recommendedIds.length === 0) return null;

  const summaries = await resolveShowSummaries(recommendedIds);
  const recommendedShows = pickShows(recommendedIds, summaries);

  return (
    <ShowCarouselRow title="Recommended for You" shows={recommendedShows} />
  );
}
