import { redirect } from 'next/navigation';
import { createClient } from '@/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (!token_hash || !type) {
    redirect('/?error=Missing token');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    const safeMessage =
      error.code === 'otp_expired'
        ? 'Your recovery link has expired. Please request a new one.'
        : 'Invalid or expired recovery link. Please request a new one.';
    redirect(`/?error=${encodeURIComponent(safeMessage)}`);
  }

  if (type === 'recovery') {
    redirect('/reset-password');
  }

  redirect('/');
}
