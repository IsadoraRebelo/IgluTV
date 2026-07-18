import 'server-only';

import { createClient } from '@/supabase/server';

import { ServiceError } from './errors';
import { requireViewer } from './viewer';

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
  const viewer = await requireViewer();
  if (!viewer.email)
    throw new ServiceError('Not authenticated', 'not_authenticated');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: viewer.email,
    password,
  });

  if (error)
    throw new ServiceError('Incorrect password', 'invalid_credentials');
}

export async function updateEmail(newEmail: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) throw new ServiceError(error.message, error.code);

  return data;
}
