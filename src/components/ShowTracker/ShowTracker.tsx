'use client';

import { SeasonAccordion, WatchNextCard } from '@/components';
import type { CastMember, Season, ShowDetails, ShowMeta } from '@/types';

import { useShowTrackingContext } from './ShowTrackingContext';
import { episodeKey, getEpisodeSectionState } from './utils';

export function ShowTracker({
  seasons,
  cast,
  meta,
  details,
}: {
  seasons: Season[];
  cast: CastMember[];
  meta: ShowMeta | null;
  details: ShowDetails;
}) {
  const {
    watchedCounts,
    pendingKeys,
    onToggleEpisode,
    onRewatchEpisode,
    onRemoveLastEpisodeRewatch,
    onToggleSeason,
    onRewatchSeason,
    onRemoveLastSeasonRewatch,
  } = useShowTrackingContext();

  const episodeSection = getEpisodeSectionState(meta, details, watchedCounts);
  const isCurrentEpisodePending =
    episodeSection.kind === 'latest' || episodeSection.kind === 'next'
      ? pendingKeys.has(
          episodeKey(
            episodeSection.episode.seasonNumber,
            episodeSection.episode.episodeNumber
          )
        )
      : false;

  return (
    <>
      {episodeSection.kind !== 'hidden' ? (
        <WatchNextCard
          episodeSection={episodeSection}
          cast={cast}
          isPending={isCurrentEpisodePending}
          onToggleEpisode={onToggleEpisode}
        />
      ) : null}

      {seasons.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">
            Seasons ({meta?.numberOfSeasons ?? seasons.length})
          </h2>
          <SeasonAccordion
            seasons={seasons}
            cast={cast}
            watchedCounts={watchedCounts}
            pendingKeys={pendingKeys}
            onToggleEpisode={onToggleEpisode}
            onRewatchEpisode={onRewatchEpisode}
            onRemoveLastEpisodeRewatch={onRemoveLastEpisodeRewatch}
            onToggleSeason={onToggleSeason}
            onRewatchSeason={onRewatchSeason}
            onRemoveLastSeasonRewatch={onRemoveLastSeasonRewatch}
          />
        </section>
      ) : null}
    </>
  );
}
