'use server';

import { randomUUID } from 'crypto';

import { createClient } from '@/supabase/server';

import { ServiceError } from './errors';

const AVATAR_BUCKET = 'profile';

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

export async function updateUsername(username: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ServiceError('Not authenticated', 'not_authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505') {
      throw new ServiceError('Username is already taken', error.code);
    }
    throw new ServiceError(error.message, error.code);
  }
}

export async function updateBannerUrl(bannerUrl: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ServiceError('Not authenticated', 'not_authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ banner_url: bannerUrl })
    .eq('id', user.id);

  if (error) throw new ServiceError(error.message, error.code);
}

export async function uploadAvatar(formData: FormData): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ServiceError('Not authenticated', 'not_authenticated');

  const file = formData.get('file') as File | null;
  if (!file) throw new ServiceError('Please select an image to upload');

  const { data: current } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const fileExt = file.name.split('.').pop();
  const filePath = `${user.id}-${randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadError) {
    if (uploadError.message.includes('Payload too large')) {
      throw new ServiceError('Image is too large. Please use a smaller file');
    }
    if (uploadError.message.includes('mime type')) {
      throw new ServiceError('Unsupported image format');
    }

    console.log('Upload error:', uploadError);
    throw new ServiceError('Failed to upload image. Please try again');
  }

  const previousPath = current?.avatar_url?.split('/').pop();
  if (previousPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  if (error) throw new ServiceError('Failed to save image. Please try again');

  return publicUrl;
}
