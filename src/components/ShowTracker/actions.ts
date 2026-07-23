'use server';

import { setCustomShowImage } from '@/services/custom-show-images';
import { ServiceError } from '@/services/errors';
import {
  markEpisodeWatched,
  markSeasonWatched,
  removeLastEpisodeRewatch,
  removeLastSeasonRewatch,
  removeShowTracking,
  rewatchSeason,
  setShowStatus,
  setSkipCatchUpPrompt,
  toggleFavourite,
  unmarkEpisodeWatched,
  unmarkSeasonWatched,
  updateEpisodeWatchDate,
} from '@/services/tracking';
import { getTmdbShowFullDetails, getTmdbShowImages } from '@/services/tv-shows';

import type {
  CastMember,
  LatestEpisode,
  Season,
  ShowBackdropImage,
  ShowImageKind,
  ShowStatus,
} from '@/types';

export type TrackingActionResult =
  | { ok: true; nextEpisode?: LatestEpisode | null }
  | { ok: false; code: string | null; message: string };

async function toResult(work: Promise<void>): Promise<TrackingActionResult> {
  try {
    await work;
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code ?? null, message: error.message };
    }
    return { ok: false, code: null, message: 'Something went wrong' };
  }
}

export async function markEpisodeWatchedAction(
  showId: number,
  season: number,
  episode: number
): Promise<TrackingActionResult> {
  try {
    const nextEpisode = await markEpisodeWatched(showId, season, episode);
    return { ok: true, nextEpisode };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code ?? null, message: error.message };
    }
    return { ok: false, code: null, message: 'Something went wrong' };
  }
}

// Powers the tracking page's lazy season load: the episode modal on a row
// that only ever fetched a single next-episode (see getTrackingRows) has no
// season data of its own, so it fetches one show's full details on open,
// exactly like the show page does eagerly.
export async function loadShowSeasonsAction(showId: number): Promise<{
  seasons: Season[];
  cast: CastMember[];
  tmdbStatus: string | null;
} | null> {
  const full = await getTmdbShowFullDetails(showId);
  if (!full) return null;

  return {
    seasons: full.meta.seasons,
    cast: full.details.cast,
    tmdbStatus: full.details.status,
  };
}

export async function unmarkEpisodeWatchedAction(
  showId: number,
  season: number,
  episode: number
): Promise<TrackingActionResult> {
  return toResult(unmarkEpisodeWatched(showId, season, episode));
}

export async function markSeasonWatchedAction(
  showId: number,
  season: number,
  episodeNumbers: number[],
  watchedOn: string | null
): Promise<TrackingActionResult> {
  return toResult(markSeasonWatched(showId, season, episodeNumbers, watchedOn));
}

export async function unmarkSeasonWatchedAction(
  showId: number,
  season: number
): Promise<TrackingActionResult> {
  return toResult(unmarkSeasonWatched(showId, season));
}

export async function rewatchSeasonAction(
  showId: number,
  season: number,
  episodeNumbers: number[]
): Promise<TrackingActionResult> {
  return toResult(rewatchSeason(showId, season, episodeNumbers));
}

export async function removeLastEpisodeRewatchAction(
  showId: number,
  season: number,
  episode: number
): Promise<TrackingActionResult> {
  return toResult(removeLastEpisodeRewatch(showId, season, episode));
}

export async function removeLastSeasonRewatchAction(
  showId: number,
  season: number,
  episodeNumbers: number[]
): Promise<TrackingActionResult> {
  return toResult(removeLastSeasonRewatch(showId, season, episodeNumbers));
}

export async function setSkipCatchUpPromptAction(
  showId: number,
  skip: boolean
): Promise<TrackingActionResult> {
  return toResult(setSkipCatchUpPrompt(showId, skip));
}

export async function setShowStatusAction(
  showId: number,
  status: ShowStatus
): Promise<TrackingActionResult> {
  return toResult(setShowStatus(showId, status));
}

export async function removeShowTrackingAction(
  showId: number
): Promise<TrackingActionResult> {
  return toResult(removeShowTracking(showId));
}

export async function toggleFavouriteAction(
  showId: number,
  next: boolean
): Promise<TrackingActionResult> {
  return toResult(toggleFavourite(showId, next));
}

export async function updateEpisodeWatchDateAction(
  showId: number,
  season: number,
  episode: number,
  previousDate: string | null,
  nextDate: string | null
): Promise<TrackingActionResult> {
  return toResult(
    updateEpisodeWatchDate(showId, season, episode, previousDate, nextDate)
  );
}

export async function setCustomShowImageAction(
  showId: number,
  kind: ShowImageKind,
  url: string | null
): Promise<TrackingActionResult> {
  return toResult(setCustomShowImage(showId, kind, url));
}

export async function getShowImageOptionsAction(
  showId: number,
  kind: ShowImageKind
): Promise<ShowBackdropImage[]> {
  return getTmdbShowImages(showId, kind);
}
