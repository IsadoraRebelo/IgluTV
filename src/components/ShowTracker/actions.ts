'use server';

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

import type { ShowStatus } from '@/types';

export type TrackingActionResult =
  { ok: true } | { ok: false; code: string | null; message: string };

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
  return toResult(markEpisodeWatched(showId, season, episode));
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
  episodeNumbers: number[]
): Promise<TrackingActionResult> {
  return toResult(markSeasonWatched(showId, season, episodeNumbers));
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
  previousDate: string,
  nextDate: string
): Promise<TrackingActionResult> {
  return toResult(
    updateEpisodeWatchDate(showId, season, episode, previousDate, nextDate)
  );
}
