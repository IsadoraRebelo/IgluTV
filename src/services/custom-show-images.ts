import 'server-only';

import { createClient } from '@/supabase/server';

import type { ShowImageKind } from '@/types';

import { ServiceError } from './errors';
import { requireViewer } from './viewer';

export async function getCustomShowImages(
  userId: string,
  showIds: number[]
): Promise<
  Map<
    number,
    { customPosterUrl: string | null; customBannerUrl: string | null }
  >
> {
  const map = new Map<
    number,
    { customPosterUrl: string | null; customBannerUrl: string | null }
  >();
  if (showIds.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('show_tracking')
    .select('tmdb_show_id, custom_poster_url, custom_banner_url')
    .eq('user_id', userId)
    .in('tmdb_show_id', showIds);

  if (error) throw new ServiceError(error.message, error.code);

  for (const row of data ?? []) {
    map.set(row.tmdb_show_id, {
      customPosterUrl: row.custom_poster_url,
      customBannerUrl: row.custom_banner_url,
    });
  }

  return map;
}

// Only reachable from the UI while the caller is already following the
// show (the menu action is hidden otherwise), so the show_tracking row is
// guaranteed to exist — a plain update, not an upsert.
export async function setCustomShowImage(
  showId: number,
  kind: ShowImageKind,
  url: string | null
): Promise<void> {
  const supabase = await createClient();
  const viewer = await requireViewer();

  const updateData =
    kind === 'poster' ? { custom_poster_url: url } : { custom_banner_url: url };

  const { error } = await supabase
    .from('show_tracking')
    .update(updateData)
    .eq('user_id', viewer.id)
    .eq('tmdb_show_id', showId);

  if (error) throw new ServiceError(error.message, error.code);
}
