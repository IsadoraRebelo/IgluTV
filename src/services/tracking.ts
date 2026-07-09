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
