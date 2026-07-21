import { getDaysUntilAir } from '@/components/ShowTracker/utils';

import type {
  CastMember,
  EpisodeWatch,
  Season,
  SeasonEpisode,
  ShowStatus,
} from '@/types';

export type TrackingShow = {
  showId: number;
  showName: string;
  posterUrl: string | null;
  network: string | null;
  seasons: Season[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
  cast: CastMember[];
};

export type UpcomingEpisode = {
  showId: number;
  showName: string;
  posterUrl: string | null;
  network: string | null;
  seasonNumber: number;
  episode: SeasonEpisode;
  daysUntilAir: number;
  daysLabel: 'DAY' | 'DAYS';
  seasons: Season[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
  cast: CastMember[];
};

export type UpcomingGroup = {
  label: string;
  entries: UpcomingEpisode[];
};

const UPCOMING_LIMIT = 8;

function bucketLabel(daysUntilAir: number, airDate: Date): string {
  if (daysUntilAir === 1) return 'TOMORROW';
  if (daysUntilAir <= 6) {
    return airDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();
  }
  return 'LATER';
}

export function buildUpcomingGroups(shows: TrackingShow[]): UpcomingGroup[] {
  const episodes: (UpcomingEpisode & { sortKey: string })[] = [];

  for (const show of shows) {
    for (const season of show.seasons) {
      if (season.seasonNumber <= 0) continue;

      for (const episode of season.episodes) {
        const daysUntilAir = getDaysUntilAir(episode.airDate);
        if (daysUntilAir === null) continue;

        episodes.push({
          showId: show.showId,
          showName: show.showName,
          posterUrl: show.posterUrl,
          network: show.network,
          seasonNumber: season.seasonNumber,
          episode,
          daysUntilAir,
          daysLabel: daysUntilAir === 1 ? 'DAY' : 'DAYS',
          seasons: show.seasons,
          watchedEpisodes: show.watchedEpisodes,
          skipCatchUpPrompt: show.skipCatchUpPrompt,
          initialStatus: show.initialStatus,
          tmdbStatus: show.tmdbStatus,
          cast: show.cast,
          sortKey: episode.airDate ?? '',
        });
      }
    }
  }

  episodes.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const groups: UpcomingGroup[] = [];
  for (const { sortKey: _sortKey, ...entry } of episodes.slice(
    0,
    UPCOMING_LIMIT
  )) {
    const airDate = new Date(`${entry.episode.airDate}T00:00:00`);
    const label = bucketLabel(entry.daysUntilAir, airDate);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({ label, entries: [entry] });
    }
  }

  return groups;
}
