'use server';

import { updatePassword } from '@/services/auth';
import { ServiceError } from '@/services/errors';
import { changePasswordFormSchema, PasswordUserInput } from '@/types';

export async function updatePasswordAction({
  data,
}: {
  data: PasswordUserInput;
}) {
  const parsed = changePasswordFormSchema.safeParse(data);

  if (!parsed.success) return { error: 'Invalid form data', code: null };

  try {
    await updatePassword(parsed.data.password);

    return { error: null, code: null };
  } catch (error) {
    if (error instanceof ServiceError)
      return { error: error.message, code: error.code ?? null };

    return { error: 'Failed to update password', code: null };
  }
}
