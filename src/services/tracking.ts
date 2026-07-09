'use server';

import { createClient } from '@/supabase/server';
import type { EpisodeWatch, ShowStatus, ShowTracking } from '@/types';

import { ServiceError } from './errors';

export async function getShowTracking(
  showId: number
): Promise<ShowTracking | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('show_tracking')
    .select('tmdb_show_id, status, is_favourite')
    .eq('tmdb_show_id', showId)
    .maybeSingle();

  if (error) throw new ServiceError(error.message, error.code);
  if (!data) return null;

  return {
    tmdbShowId: data.tmdb_show_id,
    status: data.status as ShowStatus,
    isFavourite: data.is_favourite,
  };
}

export async function getWatchedEpisodes(
  showId: number
): Promise<EpisodeWatch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('episode_watches')
    .select('id, season_number, episode_number, watched_on')
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

export async function getMyShows(
  status?: ShowStatus
): Promise<ShowTracking[]> {
  const supabase = await createClient();

  let query = supabase
    .from('show_tracking')
    .select('tmdb_show_id, status, is_favourite');

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new ServiceError(error.message, error.code);

  return (data ?? []).map((row) => ({
    tmdbShowId: row.tmdb_show_id,
    status: row.status as ShowStatus,
    isFavourite: row.is_favourite,
  }));
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

export async function setShowStatus(
  showId: number,
  status: ShowStatus
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase
    .from('show_tracking')
    .upsert(
      { user_id: userId, tmdb_show_id: showId, status },
      { onConflict: 'user_id,tmdb_show_id' }
    );

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
    return;
  }

  // Toggling favourite on an untracked show creates the row with a
  // default status of `watching` — see design spec's Data Model.
  const { error } = await supabase.from('show_tracking').insert({
    user_id: userId,
    tmdb_show_id: showId,
    status: 'watching',
    is_favourite: next,
  });

  if (error) throw new ServiceError(error.message, error.code);
}
