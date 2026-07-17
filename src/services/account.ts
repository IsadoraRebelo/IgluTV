'use server';

import { createClient } from '@/supabase/server';

import { ServiceError } from './errors';

export async function deleteAccountData(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ServiceError('Not authenticated', 'not_authenticated');

  const { error: episodeWatchesError } = await supabase
    .from('episode_watches')
    .delete()
    .eq('user_id', user.id);
  if (episodeWatchesError) {
    throw new ServiceError(episodeWatchesError.message, episodeWatchesError.code);
  }

  const { error: showTrackingError } = await supabase
    .from('show_tracking')
    .delete()
    .eq('user_id', user.id);
  if (showTrackingError) {
    throw new ServiceError(showTrackingError.message, showTrackingError.code);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id);
  if (profileError) throw new ServiceError(profileError.message, profileError.code);

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) throw new ServiceError(signOutError.message, signOutError.code);
}
