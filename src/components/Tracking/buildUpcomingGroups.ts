import { getDaysUntilAir } from '@/components/ShowTracker/utils';

import type {
  CastMember,
  EpisodeWatch,
  LatestEpisode,
  Season,
  SeasonEpisode,
  ShowStatus,
} from '@/types';

export type TrackingShow = {
  showId: number;
  showName: string;
  posterUrl: string | null;
  network: string | null;
  nextEpisode: LatestEpisode | null;
  // Every future-dated episode of the season nextEpisode belongs to — a
  // bounded fan-out (the page only fetches this for shows that already have
  // a nextEpisode, a much smaller set than all tracked shows), not the full
  // seasons-of-every-show fan-out this rewrite deliberately removed. Null
  // when unavailable (no nextEpisode, or the season fetch failed/wasn't
  // attempted) — buildUpcomingGroups then falls back to nextEpisode alone,
  // same as before this field existed.
  upcomingEpisodes: SeasonEpisode[] | null;
  seasons: Season[] | null;
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
  seasons: Season[] | null;
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

// show.nextEpisode as a single-item fallback, in TMDB's SeasonEpisode shape —
// used whenever upcomingEpisodes wasn't fetched (or came back null), so a
// show still contributes its one known future episode exactly as it did
// before upcomingEpisodes existed.
function nextEpisodeAsSeasonEpisode(episode: LatestEpisode): SeasonEpisode {
  return {
    episodeNumber: episode.episodeNumber,
    name: episode.name,
    overview: episode.overview,
    runtime: episode.runtime,
    airDate: episode.airDate,
    imageUrl: episode.imageUrl,
    arcName: null,
  };
}

export function buildUpcomingGroups(shows: TrackingShow[]): UpcomingGroup[] {
  const episodes: (UpcomingEpisode & { sortKey: string })[] = [];

  for (const show of shows) {
    if (!show.nextEpisode) continue;
    const seasonNumber = show.nextEpisode.seasonNumber;

    // Prefer the fetched season's full episode list (every future-dated
    // episode of the currently-airing season) so a weekly show mid-season
    // contributes more than one row; fall back to just nextEpisode when that
    // fetch wasn't attempted or failed.
    const candidateEpisodes =
      show.upcomingEpisodes ?? [nextEpisodeAsSeasonEpisode(show.nextEpisode)];

    for (const episode of candidateEpisodes) {
      const daysUntilAir = getDaysUntilAir(episode.airDate);
      if (daysUntilAir === null) continue;

      episodes.push({
        showId: show.showId,
        showName: show.showName,
        posterUrl: show.posterUrl,
        network: show.network,
        seasonNumber,
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
