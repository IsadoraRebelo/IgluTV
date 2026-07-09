'use server';

import { createClient } from '@/supabase/server';

import { ServiceError } from './errors';

export async function redeemInviteCode(code: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('redeem_invite_code', {
    p_code: code,
  });

  if (error) throw new ServiceError(error.message, error.code);

  return data ?? false;
}
