'use server';

import { deleteAccountData } from '@/services/account';
import { updateEmail, updatePassword, verifyPassword } from '@/services/auth';
import { ServiceError } from '@/services/errors';

export type AccountActionResult =
  | { ok: true }
  | { ok: false; message: string };

async function toResult(work: Promise<void>): Promise<AccountActionResult> {
  try {
    await work;
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: 'Something went wrong' };
  }
}

export async function changeEmailAction(input: {
  newEmail: string;
  currentPassword: string;
}): Promise<AccountActionResult> {
  return toResult(
    (async () => {
      await verifyPassword(input.currentPassword);
      await updateEmail(input.newEmail);
    })()
  );
}

export async function changePasswordAction(input: {
  newPassword: string;
  currentPassword: string;
}): Promise<AccountActionResult> {
  return toResult(
    (async () => {
      await verifyPassword(input.currentPassword);
      await updatePassword(input.newPassword);
    })()
  );
}

export async function deleteAccountAction(input: {
  currentPassword: string;
}): Promise<AccountActionResult> {
  return toResult(
    (async () => {
      await verifyPassword(input.currentPassword);
      await deleteAccountData();
    })()
  );
}
