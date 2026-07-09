'use server';

import { createClient } from '@/supabase/server';

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('signOut failed:', error.message, error.code);
    throw new Error('Something went wrong trying to log out');
  }
}
