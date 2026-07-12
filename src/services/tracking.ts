'use server';

import { isShowFinished } from '@/components/ShowTracker/utils';

import { createClient } from '@/supabase/server';

import type { EpisodeWatch, ShowStatus, ShowTracking } from '@/types';

import { ServiceError } from './errors';
import { getTmdbShowFullDetails } from './tv-shows';

const STATUS_CODES: Record<ShowStatus, number> = {
  watching: 1,
  watch_later: 2,
  paused: 3,
  dropped: 4,
  completed: 5,
};

const STATUS_BY_CODE = Object.fromEntries(
  Object.entries(STATUS_CODES).map(([status, code]) => [code, status])
) as Record<number, ShowStatus>;

function statusToCode(status: ShowStatus): number {
  return STATUS_CODES[status];
}

function codeToStatus(code: number): ShowStatus {
  const status = STATUS_BY_CODE[code];
  if (!status) throw new ServiceError(`Unknown status code: ${code}`);
  return status;
}

export async function getShowTrackingForUser(
  userId: string,
  showId: number
): Promise<ShowTracking | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('show_tracking')
    .select('tmdb_show_id, status, is_favourite, skip_catch_up_prompt')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .maybeSingle();

  if (error) throw new ServiceError(error.message, error.code);
  if (!data) return null;

  return {
    tmdbShowId: data.tmdb_show_id,
    status: codeToStatus(data.status),
    isFavourite: data.is_favourite,
    skipCatchUpPrompt: data.skip_catch_up_prompt,
  };
}

export async function getShowTracking(
  showId: number
): Promise<ShowTracking | null> {
  const supabase = await createClient();
  const userId = await getOptionalUserId(supabase);
  if (!userId) return null;

  return getShowTrackingForUser(userId, showId);
}

export async function getWatchedEpisodesForUser(
  userId: string,
  showId: number
): Promise<EpisodeWatch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('episode_watches')
    .select('id, season_number, episode_number, watched_on')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .order('watched_on', { ascending: true });

  if (error) throw new ServiceError(error.message, error.code);

  return (data ?? []).map((row) => ({
    id: row.id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    watchedOn: row.watched_on,
  }));
}

export async function getWatchedEpisodes(
  showId: number
): Promise<EpisodeWatch[]> {
  const supabase = await createClient();
  const userId = await getOptionalUserId(supabase);
  if (!userId) return [];

  return getWatchedEpisodesForUser(userId, showId);
}

type RecentWatchedEpisodeRow = {
  id: number;
  tmdbShowId: number;
  seasonNumber: number;
  episodeNumber: number;
  watchedOn: string;
};

export async function getRecentWatchedEpisodesForUser(
  userId: string,
  limit: number
): Promise<RecentWatchedEpisodeRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('episode_watches')
    .select('id, tmdb_show_id, season_number, episode_number, watched_on')
    .eq('user_id', userId)
    .order('watched_on', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit * 10);

  if (error) throw new ServiceError(error.message, error.code);

  const seenEpisodes = new Set<string>();
  const deduped: RecentWatchedEpisodeRow[] = [];

  for (const row of data ?? []) {
    const key = `${row.tmdb_show_id}-${row.season_number}-${row.episode_number}`;
    if (seenEpisodes.has(key)) continue;
    seenEpisodes.add(key);

    deduped.push({
      id: row.id,
      tmdbShowId: row.tmdb_show_id,
      seasonNumber: row.season_number,
      episodeNumber: row.episode_number,
      watchedOn: row.watched_on,
    });
    if (deduped.length >= limit) break;
  }

  return deduped;
}

export async function getRecentWatchedEpisodes(
  limit: number
): Promise<RecentWatchedEpisodeRow[]> {
  const supabase = await createClient();
  const userId = await getOptionalUserId(supabase);
  if (!userId) return [];

  return getRecentWatchedEpisodesForUser(userId, limit);
}

// Like getRecentWatchedEpisodesForUser, but deduped by show instead of by
// episode — each show appears once, with only its most recently watched
// episode, for "recent activity" views that show one card per show.
export async function getRecentWatchedShowsForUser(
  userId: string,
  limit: number
): Promise<RecentWatchedEpisodeRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('episode_watches')
    .select('id, tmdb_show_id, season_number, episode_number, watched_on')
    .eq('user_id', userId)
    .order('watched_on', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit * 20);

  if (error) throw new ServiceError(error.message, error.code);

  const seenShows = new Set<number>();
  const deduped: RecentWatchedEpisodeRow[] = [];

  for (const row of data ?? []) {
    if (seenShows.has(row.tmdb_show_id)) continue;
    seenShows.add(row.tmdb_show_id);

    deduped.push({
      id: row.id,
      tmdbShowId: row.tmdb_show_id,
      seasonNumber: row.season_number,
      episodeNumber: row.episode_number,
      watchedOn: row.watched_on,
    });
    if (deduped.length >= limit) break;
  }

  return deduped;
}

// Diary entries: one per show the user has marked 'completed', dated by
// that show's most recently watched episode (its finishing date).
export async function getFinishedShowsForUser(
  userId: string
): Promise<RecentWatchedEpisodeRow[]> {
  const supabase = await createClient();

  const { data: completedShows, error: completedError } = await supabase
    .from('show_tracking')
    .select('tmdb_show_id')
    .eq('user_id', userId)
    .eq('status', statusToCode('completed'));

  if (completedError) {
    throw new ServiceError(completedError.message, completedError.code);
  }

  const completedIds = (completedShows ?? []).map((row) => row.tmdb_show_id);
  if (completedIds.length === 0) return [];

  const { data, error } = await supabase
    .from('episode_watches')
    .select('id, tmdb_show_id, season_number, episode_number, watched_on')
    .eq('user_id', userId)
    .in('tmdb_show_id', completedIds)
    .order('watched_on', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw new ServiceError(error.message, error.code);

  const seenShows = new Set<number>();
  const deduped: RecentWatchedEpisodeRow[] = [];

  for (const row of data ?? []) {
    if (seenShows.has(row.tmdb_show_id)) continue;
    seenShows.add(row.tmdb_show_id);

    deduped.push({
      id: row.id,
      tmdbShowId: row.tmdb_show_id,
      seasonNumber: row.season_number,
      episodeNumber: row.episode_number,
      watchedOn: row.watched_on,
    });
  }

  return deduped;
}

export async function getShowsForUser(
  userId: string,
  status?: ShowStatus
): Promise<ShowTracking[]> {
  const supabase = await createClient();

  let query = supabase
    .from('show_tracking')
    .select('tmdb_show_id, status, is_favourite, skip_catch_up_prompt')
    .eq('user_id', userId);

  if (status) query = query.eq('status', statusToCode(status));

  const { data, error } = await query;
  if (error) throw new ServiceError(error.message, error.code);

  return (data ?? []).map((row) => ({
    tmdbShowId: row.tmdb_show_id,
    status: codeToStatus(row.status),
    isFavourite: row.is_favourite,
    skipCatchUpPrompt: row.skip_catch_up_prompt,
  }));
}

export async function getMyShows(status?: ShowStatus): Promise<ShowTracking[]> {
  const supabase = await createClient();
  const userId = await getOptionalUserId(supabase);
  if (!userId) return [];

  return getShowsForUser(userId, status);
}

export async function getFavouriteShowsForUser(
  userId: string
): Promise<ShowTracking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('show_tracking')
    .select('tmdb_show_id, status, is_favourite, skip_catch_up_prompt')
    .eq('user_id', userId)
    .eq('is_favourite', true);

  if (error) throw new ServiceError(error.message, error.code);

  return (data ?? []).map((row) => ({
    tmdbShowId: row.tmdb_show_id,
    status: codeToStatus(row.status),
    isFavourite: row.is_favourite,
    skipCatchUpPrompt: row.skip_catch_up_prompt,
  }));
}

export async function getWatchStatsForUser(userId: string): Promise<{
  totalShows: number;
  totalEpisodes: number;
  showsThisYear: number;
  episodesThisYear: number;
}> {
  const supabase = await createClient();

  const { count: totalShows, error: totalShowsError } = await supabase
    .from('show_tracking')
    .select('tmdb_show_id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (totalShowsError) {
    throw new ServiceError(totalShowsError.message, totalShowsError.code);
  }

  const { count: totalEpisodes, error: totalEpisodesError } = await supabase
    .from('episode_watches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (totalEpisodesError) {
    throw new ServiceError(
      totalEpisodesError.message,
      totalEpisodesError.code
    );
  }

  const currentYear = new Date().getFullYear();
  const { data: thisYearRows, error: thisYearError } = await supabase
    .from('episode_watches')
    .select('tmdb_show_id')
    .eq('user_id', userId)
    .gte('watched_on', `${currentYear}-01-01`)
    .lte('watched_on', `${currentYear}-12-31`);
  if (thisYearError) {
    throw new ServiceError(thisYearError.message, thisYearError.code);
  }

  const distinctShowsThisYear = new Set(
    (thisYearRows ?? []).map((row) => row.tmdb_show_id)
  );

  return {
    totalShows: totalShows ?? 0,
    totalEpisodes: totalEpisodes ?? 0,
    showsThisYear: distinctShowsThisYear.size,
    episodesThisYear: thisYearRows?.length ?? 0,
  };
}

async function requireUserId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new ServiceError('Not authenticated', 'not_authenticated');

  return user.id;
}

async function getOptionalUserId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function setShowStatus(
  showId: number,
  status: ShowStatus
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase
    .from('show_tracking')
    .upsert(
      { user_id: userId, tmdb_show_id: showId, status: statusToCode(status) },
      { onConflict: 'user_id,tmdb_show_id' }
    );

  if (error) throw new ServiceError(error.message, error.code);
}
export async function removeShowTracking(showId: number): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase
    .from('show_tracking')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId);

  if (error) throw new ServiceError(error.message, error.code);
}

export async function setSkipCatchUpPrompt(
  showId: number,
  skip: boolean
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase
    .from('show_tracking')
    .update({ skip_catch_up_prompt: skip })
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId);

  if (error) throw new ServiceError(error.message, error.code);
}

export async function toggleFavourite(
  showId: number,
  next: boolean
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: existing, error: selectError } = await supabase
    .from('show_tracking')
    .select('tmdb_show_id')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .maybeSingle();

  if (selectError) {
    throw new ServiceError(selectError.message, selectError.code);
  }

  if (existing) {
    const { error } = await supabase
      .from('show_tracking')
      .update({ is_favourite: next })
      .eq('user_id', userId)
      .eq('tmdb_show_id', showId);

    if (error) throw new ServiceError(error.message, error.code);

    if (!next) await pruneIfUntracked(supabase, userId, showId);
    return;
  }

  const { error } = await supabase.from('show_tracking').insert({
    user_id: userId,
    tmdb_show_id: showId,
    status: statusToCode('watching'),
    is_favourite: next,
  });

  if (error) throw new ServiceError(error.message, error.code);
}

export async function markEpisodeWatched(
  showId: number,
  season: number,
  episode: number,
  watchedOn?: string
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const insertRow: {
    user_id: string;
    tmdb_show_id: number;
    season_number: number;
    episode_number: number;
    watched_on?: string;
  } = {
    user_id: userId,
    tmdb_show_id: showId,
    season_number: season,
    episode_number: episode,
  };
  if (watchedOn) insertRow.watched_on = watchedOn;

  const { error } = await supabase.from('episode_watches').insert(insertRow);
  if (error) throw new ServiceError(error.message, error.code);

  await autoUpdateStatus(supabase, userId, showId);
}

export async function updateEpisodeWatchDate(
  showId: number,
  season: number,
  episode: number,
  previousDate: string,
  nextDate: string
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: rows, error: selectError } = await supabase
    .from('episode_watches')
    .select('id')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season)
    .eq('episode_number', episode)
    .eq('watched_on', previousDate)
    .limit(1);

  if (selectError) {
    throw new ServiceError(selectError.message, selectError.code);
  }
  if (!rows || rows.length === 0) {
    throw new ServiceError('Watch date not found', 'not_found');
  }

  const { error } = await supabase
    .from('episode_watches')
    .update({ watched_on: nextDate })
    .eq('id', rows[0].id)
    .eq('user_id', userId);

  if (error) throw new ServiceError(error.message, error.code);
}

async function autoUpdateStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  showId: number
): Promise<void> {
  const { data: tracking, error: trackingError } = await supabase
    .from('show_tracking')
    .select('status')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .maybeSingle();

  if (trackingError) {
    throw new ServiceError(trackingError.message, trackingError.code);
  }

  if (!tracking) {
    const { error } = await supabase.from('show_tracking').insert({
      user_id: userId,
      tmdb_show_id: showId,
      status: statusToCode('watching'),
    });

    if (error) throw new ServiceError(error.message, error.code);
  } else if (tracking.status === statusToCode('watch_later')) {
    const { error } = await supabase
      .from('show_tracking')
      .update({ status: statusToCode('watching') })
      .eq('user_id', userId)
      .eq('tmdb_show_id', showId);

    if (error) throw new ServiceError(error.message, error.code);
  }

  const full = await getTmdbShowFullDetails(showId);
  if (!full) return;

  const regularEpisodeCount = full.meta.seasons
    .filter((season) => season.seasonNumber > 0)
    .reduce(
      (total, season) =>
        total + (season.episodeCount ?? season.episodes.length),
      0
    );

  if (regularEpisodeCount === 0) return;

  const { data: watchedRows, error: watchedError } = await supabase
    .from('episode_watches')
    .select('season_number, episode_number')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .gt('season_number', 0);

  if (watchedError) {
    throw new ServiceError(watchedError.message, watchedError.code);
  }

  const distinctWatched = new Set(
    (watchedRows ?? []).map(
      (row) => `${row.season_number}-${row.episode_number}`
    )
  );

  if (
    distinctWatched.size >= regularEpisodeCount &&
    isShowFinished(full.details.status)
  ) {
    const { error } = await supabase
      .from('show_tracking')
      .update({ status: statusToCode('completed') })
      .eq('user_id', userId)
      .eq('tmdb_show_id', showId);

    if (error) throw new ServiceError(error.message, error.code);
  }
}

async function pruneIfUntracked(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  showId: number
): Promise<void> {
  const { count, error } = await supabase
    .from('episode_watches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId);

  if (error) throw new ServiceError(error.message, error.code);
  if ((count ?? 0) > 0) return;

  const { error: deleteError } = await supabase
    .from('show_tracking')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId);

  if (deleteError) {
    throw new ServiceError(deleteError.message, deleteError.code);
  }
}

export async function unmarkEpisodeWatched(
  showId: number,
  season: number,
  episode: number
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase
    .from('episode_watches')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season)
    .eq('episode_number', episode);

  if (error) throw new ServiceError(error.message, error.code);

  await pruneIfUntracked(supabase, userId, showId);
}

export async function removeLastEpisodeRewatch(
  showId: number,
  season: number,
  episode: number
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: rows, error: selectError } = await supabase
    .from('episode_watches')
    .select('id')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season)
    .eq('episode_number', episode)
    .order('id', { ascending: false })
    .limit(1);

  if (selectError) {
    throw new ServiceError(selectError.message, selectError.code);
  }
  if (!rows || rows.length === 0) return;

  const { error: deleteError } = await supabase
    .from('episode_watches')
    .delete()
    .eq('id', rows[0].id)
    .eq('user_id', userId);

  if (deleteError) {
    throw new ServiceError(deleteError.message, deleteError.code);
  }

  await pruneIfUntracked(supabase, userId, showId);
}

export async function markSeasonWatched(
  showId: number,
  season: number,
  episodeNumbers: number[]
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: existingRows, error: existingError } = await supabase
    .from('episode_watches')
    .select('episode_number')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season);

  if (existingError) {
    throw new ServiceError(existingError.message, existingError.code);
  }

  const alreadyWatched = new Set(
    (existingRows ?? []).map((row) => row.episode_number)
  );
  const toInsert = episodeNumbers.filter((n) => !alreadyWatched.has(n));

  if (toInsert.length > 0) {
    const { error } = await supabase.from('episode_watches').insert(
      toInsert.map((episodeNumber) => ({
        user_id: userId,
        tmdb_show_id: showId,
        season_number: season,
        episode_number: episodeNumber,
      }))
    );

    if (error) throw new ServiceError(error.message, error.code);
  }

  await autoUpdateStatus(supabase, userId, showId);
}

export async function rewatchSeason(
  showId: number,
  season: number,
  episodeNumbers: number[]
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from('episode_watches').insert(
    episodeNumbers.map((episodeNumber) => ({
      user_id: userId,
      tmdb_show_id: showId,
      season_number: season,
      episode_number: episodeNumber,
    }))
  );

  if (error) throw new ServiceError(error.message, error.code);

  await autoUpdateStatus(supabase, userId, showId);
}

export async function removeLastSeasonRewatch(
  showId: number,
  season: number,
  episodeNumbers: number[]
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: rows, error: selectError } = await supabase
    .from('episode_watches')
    .select('id, episode_number')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season)
    .in('episode_number', episodeNumbers)
    .order('id', { ascending: false });

  if (selectError) {
    throw new ServiceError(selectError.message, selectError.code);
  }

  const seenEpisodes = new Set<number>();
  const idsToDelete: number[] = [];
  for (const row of rows ?? []) {
    if (seenEpisodes.has(row.episode_number)) continue;
    seenEpisodes.add(row.episode_number);
    idsToDelete.push(row.id);
  }

  if (idsToDelete.length === 0) return;

  const { error: deleteError } = await supabase
    .from('episode_watches')
    .delete()
    .eq('user_id', userId)
    .in('id', idsToDelete);

  if (deleteError) {
    throw new ServiceError(deleteError.message, deleteError.code);
  }

  await pruneIfUntracked(supabase, userId, showId);
}

export async function unmarkSeasonWatched(
  showId: number,
  season: number
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase
    .from('episode_watches')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season);

  if (error) throw new ServiceError(error.message, error.code);

  await pruneIfUntracked(supabase, userId, showId);
}

export async function deleteWatch(watchId: number): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase
    .from('episode_watches')
    .delete()
    .eq('id', watchId)
    .eq('user_id', userId)
    .select('tmdb_show_id')
    .maybeSingle();

  if (error) throw new ServiceError(error.message, error.code);
  if (!data) return;

  await pruneIfUntracked(supabase, userId, data.tmdb_show_id);
}
