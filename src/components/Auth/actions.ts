'use server';

import { headers } from 'next/headers';

import {
  resetPasswordForEmail,
  signInWithPassword,
  signUp,
} from '@/services/auth';
import { ServiceError } from '@/services/errors';
import { redeemInviteCode } from '@/services/invite-codes';

import {
  CreateUserInput,
  loginFormSchema,
  LoginUserInput,
  recoverPasswordFormSchema,
  RecoverPasswordUserInput,
  signupFormSchema,
} from '@/types';

export async function loginWithEmailAndPassword({
  data,
}: {
  data: LoginUserInput;
}) {
  const parsed = loginFormSchema.safeParse(data);

  if (!parsed.success) return { error: 'Invalid form data', code: null };

  try {
    await signInWithPassword(parsed.data.email, parsed.data.password);

    return { error: null, code: null };
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === 'invalid_credentials')
        return { error: 'Wrong email or password', code: error.code };

      return { error: error.message, code: error.code ?? null };
    }

    return { error: 'Login failed', code: null };
  }
}

export async function signUpWithEmailAndPassword({
  data,
}: {
  data: CreateUserInput;
}) {
  const parsed = signupFormSchema.safeParse(data);

  if (!parsed.success) return { error: 'Invalid form data', code: null };

  try {
    const isValidCode = await redeemInviteCode(parsed.data.invite_code);

    if (!isValidCode)
      return {
        error: 'Invalid or already used invite code',
        code: 'invalid_invite_code',
      };

    await signUp(parsed.data.email, parsed.data.password, parsed.data.name);

    return { error: null, code: null };
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === 'user_already_exists')
        return { error: 'Email already registered', code: error.code };

      return { error: error.message, code: error.code ?? null };
    }

    return { error: 'Signup failed', code: null };
  }
}

export async function recoverPasswordWithEmail({
  data,
}: {
  data: RecoverPasswordUserInput;
}) {
  const parsed = recoverPasswordFormSchema.safeParse(data);

  if (!parsed.success) return { error: 'Invalid form data', code: null };

  try {
    const origin = (await headers()).get('origin') ?? '';

    await resetPasswordForEmail(parsed.data.email, `${origin}/`);

    return { error: null, code: null };
  } catch (error) {
    if (error instanceof ServiceError)
      return { error: error.message, code: error.code ?? null };

    return { error: 'Failed to send recovery email', code: null };
  }
}
