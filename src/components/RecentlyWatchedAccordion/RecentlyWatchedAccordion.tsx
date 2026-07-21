'use client';

import { AccordionSection, WatchListRow } from '@/components';

import type {
  CastMember,
  EpisodeWatch,
  LatestEpisode,
  Season,
  ShowStatus,
} from '@/types';

export type RecentWatchEntry = {
  showId: number;
  showName: string;
  posterUrl: string | null;
  network: string | null;
  episode: LatestEpisode;
  watchedOn: string;
  seasons: Season[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
  cast: CastMember[];
};

export function RecentlyWatchedAccordion({
  entries,
}: {
  entries: RecentWatchEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <AccordionSection title="Recently Watched">
      {entries.map((entry) => (
        <WatchListRow
          key={`${entry.showId}-${entry.episode.seasonNumber}-${entry.episode.episodeNumber}-${entry.watchedOn}`}
          showId={entry.showId}
          showName={entry.showName}
          episode={entry.episode}
          backlogCount={0}
          badge={null}
          seasons={entry.seasons}
          watchedEpisodes={entry.watchedEpisodes}
          skipCatchUpPrompt={entry.skipCatchUpPrompt}
          initialStatus={entry.initialStatus}
          tmdbStatus={entry.tmdbStatus}
          cast={entry.cast}
          faded
        />
      ))}
    </AccordionSection>
  );
}
