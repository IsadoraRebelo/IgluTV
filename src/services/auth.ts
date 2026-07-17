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

export async function signUp(
  email: string,
  password: string,
  username: string
) {
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

export async function verifyPassword(password: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new ServiceError('Not authenticated', 'not_authenticated');

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (error) throw new ServiceError('Incorrect password', 'invalid_credentials');
}

export async function updateEmail(newEmail: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) throw new ServiceError(error.message, error.code);

  return data;
}
