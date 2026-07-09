'use server';

import { createClient } from '@/supabase/server';

import { ServiceError } from './errors';

export async function signInWithPassword(email: string, password: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new ServiceError(error.message, error.code);

  return data;
}

export async function signUp(email: string, password: string, username: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) throw new ServiceError(error.message, error.code);

  return data;
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw new ServiceError(error.message, error.code);
}

export async function updatePassword(password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) throw new ServiceError(error.message, error.code);

  return data;
}
