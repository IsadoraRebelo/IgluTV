'use server';

import { createClient } from '@/supabase/server';

import { ServiceError } from './errors';

export async function getUserCountry(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('country')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new ServiceError(error.message, error.code);

  return data?.country ?? null;
}

export async function updateUserCountry(country: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ServiceError('Not authenticated', 'not_authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ country })
    .eq('id', user.id);

  if (error) throw new ServiceError(error.message, error.code);
}

export async function getCurrentUsername(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new ServiceError(error.message, error.code);

  return data?.username ?? null;
}

export async function getProfileByUsername(username: string): Promise<{
  id: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, banner_url')
    .eq('username', username)
    .maybeSingle();

  if (error) throw new ServiceError(error.message, error.code);
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url,
    bannerUrl: data.banner_url,
  };
}
