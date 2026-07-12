import type {
  EpisodeWatch,
  LatestEpisode,
  Season,
  ShowDetails,
  ShowMeta,
} from '@/types';

export function episodeKey(season: number, episode: number): string {
  return `${season}-${episode}`;
}

export function buildWatchedDatesMap(
  watched: EpisodeWatch[]
): Map<string, string[]> {
  const dates = new Map<string, string[]>();
  for (const w of watched) {
    const key = episodeKey(w.seasonNumber, w.episodeNumber);
    const existing = dates.get(key);
    if (existing) existing.push(w.watchedOn);
    else dates.set(key, [w.watchedOn]);
  }
  return dates;
}

export function getWatchCount(
  watchedDates: Map<string, string[]>,
  key: string
): number {
  return (watchedDates.get(key) ?? []).length;
}

export function getRewatchCount(
  watchedDates: Map<string, string[]>,
  key: string
): number {
  return Math.max(0, getWatchCount(watchedDates, key) - 1);
}

export function getWatchedDates(
  watchedDates: Map<string, string[]>,
  key: string
): string[] {
  return watchedDates.get(key) ?? [];
}

export function getDaysUntilAir(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const airDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(airDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((airDate.getTime() - today.getTime()) / 86_400_000);
  return days > 0 ? days : null;
}

export function hasEpisodeAired(airDate: string | null): boolean {
  if (!airDate) return false;
  const date = new Date(`${airDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() <= today.getTime();
}

export function isOlderThanDays(dateStr: string, days: number): boolean {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (today.getTime() - date.getTime()) / 86_400_000
  );
  return diffDays > days;
}

export type EpisodeRef = { seasonNumber: number; episodeNumber: number };

export function getPriorUnwatchedAiredEpisodes(
  seasons: Season[],
  watchedDates: Map<string, string[]>,
  cutoffSeason: number,
  cutoffEpisode: number | null
): EpisodeRef[] {
  const prior: EpisodeRef[] = [];

  for (const season of seasons) {
    if (season.seasonNumber <= 0 || season.seasonNumber > cutoffSeason) {
      continue;
    }

    for (const episode of season.episodes) {
      const isBeforeCutoff =
        season.seasonNumber < cutoffSeason ||
        (cutoffEpisode !== null && episode.episodeNumber < cutoffEpisode);
      if (!isBeforeCutoff) continue;
      if (getDaysUntilAir(episode.airDate) !== null) continue;

      const key = episodeKey(season.seasonNumber, episode.episodeNumber);
      if (getWatchCount(watchedDates, key) === 0) {
        prior.push({
          seasonNumber: season.seasonNumber,
          episodeNumber: episode.episodeNumber,
        });
      }
    }
  }

  return prior;
}

export function getWatchNextEpisode(
  seasons: Season[],
  watchedDates: Map<string, string[]>
): LatestEpisode | null {
  let furthest: { seasonNumber: number; episodeNumber: number } | null = null;

  for (const season of seasons) {
    if (season.seasonNumber <= 0) continue;

    for (const episode of season.episodes) {
      const key = episodeKey(season.seasonNumber, episode.episodeNumber);
      if (getWatchCount(watchedDates, key) === 0) continue;

      if (
        !furthest ||
        season.seasonNumber > furthest.seasonNumber ||
        (season.seasonNumber === furthest.seasonNumber &&
          episode.episodeNumber > furthest.episodeNumber)
      ) {
        furthest = {
          seasonNumber: season.seasonNumber,
          episodeNumber: episode.episodeNumber,
        };
      }
    }
  }

  if (!furthest) return null;

  for (const season of seasons) {
    if (season.seasonNumber <= 0) continue;

    for (const episode of season.episodes) {
      const isAtOrBeforeFurthest =
        season.seasonNumber < furthest.seasonNumber ||
        (season.seasonNumber === furthest.seasonNumber &&
          episode.episodeNumber <= furthest.episodeNumber);
      if (isAtOrBeforeFurthest) continue;
      if (!hasEpisodeAired(episode.airDate)) continue;

      return {
        name: episode.name,
        overview: episode.overview,
        seasonNumber: season.seasonNumber,
        episodeNumber: episode.episodeNumber,
        airDate: episode.airDate,
        runtime: episode.runtime,
        imageUrl: episode.imageUrl,
      };
    }
  }

  return null;
}

// TMDB's own vocabulary for "this show will never air again" — anything
// else (Returning Series, In Production, Planned, Pilot) can still air more.
const FINISHED_SHOW_STATUSES = new Set(['Ended', 'Canceled']);

export function isShowFinished(status: string | null): boolean {
  return status !== null && FINISHED_SHOW_STATUSES.has(status);
}

export type EpisodeSectionState =
  | { kind: 'latest'; title: string; episode: LatestEpisode }
  | { kind: 'next'; title: string; episode: LatestEpisode }
  | { kind: 'caught-up'; title: string }
  | { kind: 'hidden' };

export function getEpisodeSectionState(
  meta: ShowMeta | null,
  details: ShowDetails,
  watchedDates: Map<string, string[]>
): EpisodeSectionState {
  if (watchedDates.size === 0) {
    return meta?.latestEpisode
      ? { kind: 'latest', title: 'Latest episode', episode: meta.latestEpisode }
      : { kind: 'hidden' };
  }

  const nextEpisode = getWatchNextEpisode(meta?.seasons ?? [], watchedDates);
  if (nextEpisode) {
    return { kind: 'next', title: 'Watch Next', episode: nextEpisode };
  }

  if (isShowFinished(details.status)) return { kind: 'hidden' };

  if (meta?.nextEpisode) {
    return { kind: 'next', title: 'Watch Next', episode: meta.nextEpisode };
  }

  return { kind: 'caught-up', title: 'Watch Next' };
}
