import type {
  DisplayStatus,
  EpisodeWatch,
  LatestEpisode,
  Season,
  ShowDetails,
  ShowMeta,
  ShowStatus,
} from '@/types';

export function episodeKey(season: number, episode: number): string {
  return `${season}-${episode}`;
}

export function buildWatchedDatesMap(
  watched: EpisodeWatch[]
): Map<string, (string | null)[]> {
  const dates = new Map<string, (string | null)[]>();
  for (const w of watched) {
    const key = episodeKey(w.seasonNumber, w.episodeNumber);
    const existing = dates.get(key);
    if (existing) existing.push(w.watchedOn);
    else dates.set(key, [w.watchedOn]);
  }
  return dates;
}

export function getWatchCount(
  watchedDates: Map<string, (string | null)[]>,
  key: string
): number {
  return (watchedDates.get(key) ?? []).length;
}

export function getRewatchCount(
  watchedDates: Map<string, (string | null)[]>,
  key: string
): number {
  return Math.max(0, getWatchCount(watchedDates, key) - 1);
}

export function getWatchedDates(
  watchedDates: Map<string, (string | null)[]>,
  key: string
): (string | null)[] {
  return watchedDates.get(key) ?? [];
}

export function getWatchStatusBackground(
  showStatus: ShowStatus | null,
  watchedCount: number,
  markableCount: number
): string {
  if (markableCount === 0 || watchedCount === 0) return 'var(--color-muted)';

  const fillColor =
    showStatus === 'paused'
      ? 'var(--color-paused)'
      : showStatus === 'dropped'
        ? 'var(--color-dropped)'
        : 'var(--color-accent)';

  if (watchedCount >= markableCount) return fillColor;

  const percent = (watchedCount / markableCount) * 100;
  return `linear-gradient(to right, ${fillColor} ${percent}%, var(--color-muted) ${percent}%)`;
}

export function getDisplayStatus(
  status: ShowStatus,
  watchedCount: number,
  markableCount: number
): DisplayStatus {
  if (status === 'paused') return 'paused';
  if (status === 'dropped') return 'dropped';
  if (status === 'completed') return 'finished';
  return markableCount > 0 && watchedCount >= markableCount
    ? 'caught-up'
    : 'ongoing';
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
  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86_400_000);
  return diffDays > days;
}

export type EpisodeRef = { seasonNumber: number; episodeNumber: number };

export function getPriorUnwatchedAiredEpisodes(
  seasons: Season[],
  watchedDates: Map<string, (string | null)[]>,
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

// All aired-and-unwatched episodes across every regular season, with no cutoff —
// unlike getPriorUnwatchedAiredEpisodes, this also catches episodes that aired
// *after* the current "watch next" pick (e.g. you're a couple episodes behind on
// a currently-airing season), not just ones skipped earlier.
export function getAiredUnwatchedEpisodes(
  seasons: Season[],
  watchedDates: Map<string, (string | null)[]>
): EpisodeRef[] {
  const airedUnwatched: EpisodeRef[] = [];

  for (const season of seasons) {
    if (season.seasonNumber <= 0) continue;

    for (const episode of season.episodes) {
      if (!hasEpisodeAired(episode.airDate)) continue;

      const key = episodeKey(season.seasonNumber, episode.episodeNumber);
      if (getWatchCount(watchedDates, key) === 0) {
        airedUnwatched.push({
          seasonNumber: season.seasonNumber,
          episodeNumber: episode.episodeNumber,
        });
      }
    }
  }

  return airedUnwatched;
}

export function getWatchNextEpisode(
  seasons: Season[],
  watchedDates: Map<string, (string | null)[]>
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

export function getFirstEpisode(seasons: Season[]): LatestEpisode | null {
  const regularSeasons = [...seasons]
    .filter((season) => season.seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  for (const season of regularSeasons) {
    const episode = [...season.episodes].sort(
      (a, b) => a.episodeNumber - b.episodeNumber
    )[0];
    if (!episode) continue;

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

  return null;
}

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
  watchedDates: Map<string, (string | null)[]>
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
