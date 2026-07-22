import 'server-only';

import { createClient } from '@/supabase/server';

import type { ShowStatus } from '@/types';

import { ServiceError } from './errors';
import { type MergeableWatch, planEpisodeInserts } from './tv-time-import';

export type ResolvedWatch = MergeableWatch;

const STATUS_CODES: Record<ShowStatus, number> = {
  watching: 1,
  watch_later: 2,
  paused: 3,
  dropped: 4,
  completed: 5,
};

const EXISTING_PAGE_SIZE = 1000;
const INSERT_BATCH_SIZE = 500;

// Paged explicitly: PostgREST caps un-ranged responses at the project's
// "Max rows" setting, and one show in a real export has 1,206 watch rows.
// A truncated read would make the merge think rows are missing and insert
// duplicates that every later run would compound.
async function readExistingWatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tmdbShowId: number
): Promise<{ seasonNumber: number; episodeNumber: number }[]> {
  const rows: { seasonNumber: number; episodeNumber: number }[] = [];

  for (let from = 0; ; from += EXISTING_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('episode_watches')
      .select('season_number, episode_number')
      .eq('user_id', userId)
      .eq('tmdb_show_id', tmdbShowId)
      .range(from, from + EXISTING_PAGE_SIZE - 1);

    if (error) throw new ServiceError(error.message, error.code);
    if (!data || data.length === 0) break;

    for (const row of data) {
      rows.push({
        seasonNumber: row.season_number,
        episodeNumber: row.episode_number,
      });
    }

    if (data.length < EXISTING_PAGE_SIZE) break;
  }

  return rows;
}

export async function mergeEpisodeWatches(
  userId: string,
  tmdbShowId: number,
  watches: ResolvedWatch[]
): Promise<{ inserted: number; skipped: number; distinctEpisodes: number }> {
  const supabase = await createClient();

  const existing = await readExistingWatches(supabase, userId, tmdbShowId);

  const { toInsert, skipped, distinctEpisodes } = planEpisodeInserts(
    existing,
    watches
  );

  for (let i = 0; i < toInsert.length; i += INSERT_BATCH_SIZE) {
    const batch = toInsert.slice(i, i + INSERT_BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('episode_watches')
      .insert(
        batch.map((watch) => ({
          user_id: userId,
          tmdb_show_id: tmdbShowId,
          season_number: watch.seasonNumber,
          episode_number: watch.episodeNumber,
          created_at: watch.createdAt,
          watched_on: watch.watchedOn,
        }))
      );

    if (insertError) {
      throw new ServiceError(insertError.message, insertError.code);
    }
  }

  return { inserted: toInsert.length, skipped, distinctEpisodes };
}

// Tracking rows are inserted, never updated — the same "never overwrite" rule
// episode_watches follows. Overwriting would clear a favourite the user set in
// the app and reset the show's status and tracking date.
export async function insertShowTrackingIfAbsent(input: {
  userId: string;
  tmdbShowId: number;
  status: ShowStatus;
  isFavourite: boolean;
  createdAt: string | null;
}): Promise<{ inserted: boolean }> {
  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from('show_tracking')
    .select('tmdb_show_id')
    .eq('user_id', input.userId)
    .eq('tmdb_show_id', input.tmdbShowId)
    .maybeSingle();

  if (readError) throw new ServiceError(readError.message, readError.code);
  if (existing) return { inserted: false };

  const row: {
    user_id: string;
    tmdb_show_id: number;
    status: number;
    is_favourite: boolean;
    created_at?: string;
  } = {
    user_id: input.userId,
    tmdb_show_id: input.tmdbShowId,
    status: STATUS_CODES[input.status],
    is_favourite: input.isFavourite,
  };

  if (input.createdAt) row.created_at = input.createdAt;

  const { error } = await supabase.from('show_tracking').insert(row);

  if (error) throw new ServiceError(error.message, error.code);

  return { inserted: true };
}
