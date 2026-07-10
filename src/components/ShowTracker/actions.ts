'use server';

import { ServiceError } from '@/services/errors';
import {
  markEpisodeWatched,
  markSeasonWatched,
  resetEpisodeToSingleWatch,
  resetSeasonToSingleWatch,
  rewatchSeason,
  setSkipCatchUpPrompt,
  unmarkEpisodeWatched,
  unmarkSeasonWatched,
} from '@/services/tracking';

export type TrackingActionResult =
  | { ok: true }
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

export async function resetEpisodeToSingleWatchAction(
  showId: number,
  season: number,
  episode: number
): Promise<TrackingActionResult> {
  return toResult(resetEpisodeToSingleWatch(showId, season, episode));
}

export async function resetSeasonToSingleWatchAction(
  showId: number,
  season: number,
  episodeNumbers: number[]
): Promise<TrackingActionResult> {
  return toResult(resetSeasonToSingleWatch(showId, season, episodeNumbers));
}

export async function setSkipCatchUpPromptAction(
  showId: number,
  skip: boolean
): Promise<TrackingActionResult> {
  return toResult(setSkipCatchUpPrompt(showId, skip));
}
