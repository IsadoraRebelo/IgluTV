import { cache } from 'react';
import 'server-only';

import { createClient } from '@/supabase/server';

import { ServiceError } from './errors';

export type Viewer = {
  id: string;
  email: string | undefined;
  username: string | null;
  country: string | null;
  avatarUrl: string | null;
};

// Request-scoped: dedupes the auth check + profile lookup across every
// call site within one request. createClient() is already React
// cache()-wrapped, but auth.getUser() and the profiles query are not —
// this is what actually collapses them to one round trip each per request.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('username, country, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new ServiceError(error.message, error.code);

  return {
    id: user.id,
    email: user.email,
    username: data?.username ?? null,
    country: data?.country ?? null,
    avatarUrl: data?.avatar_url ?? null,
  };
});

export async function getViewerId(): Promise<string | null> {
  const viewer = await getViewer();
  return viewer?.id ?? null;
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    throw new ServiceError('Not authenticated', 'not_authenticated');
  }
  return viewer;
}
