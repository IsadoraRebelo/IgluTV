'use server';

import { ServiceError } from '@/services/errors';
import { updateBannerUrl, updateUsername } from '@/services/profile';
import { getShowsForUser } from '@/services/tracking';
import { getTmdbShowImages, resolveShowSummaries } from '@/services/tv-shows';

import { createClient } from '@/supabase/server';

import type { ShowBackdropImage } from '@/types';

export type ProfileSettingsActionResult =
  | { ok: true }
  | { ok: false; message: string };

async function toResult(
  work: Promise<void>
): Promise<ProfileSettingsActionResult> {
  try {
    await work;
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: 'Something went wrong' };
  }
}

export async function updateUsernameAction(
  username: string
): Promise<ProfileSettingsActionResult> {
  return toResult(updateUsername(username));
}

export async function updateBannerAction(
  bannerUrl: string
): Promise<ProfileSettingsActionResult> {
  return toResult(updateBannerUrl(bannerUrl));
}

export type BannerShowOption = {
  id: number;
  name: string;
  posterUrl: string | null;
};

export async function getMyShowsForBannerPickerAction(): Promise<
  BannerShowOption[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tracked = await getShowsForUser(user.id);
  const summaries = await resolveShowSummaries(
    tracked.map((show) => show.tmdbShowId)
  );

  return Array.from(summaries.values())
    .map((show) => ({
      id: show.id,
      name: show.name,
      posterUrl: show.posterUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getShowBackdropsAction(
  showId: number
): Promise<ShowBackdropImage[]> {
  return getTmdbShowImages(showId);
}
