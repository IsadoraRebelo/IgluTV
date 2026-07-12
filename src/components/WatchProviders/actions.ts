'use server';

import { ServiceError } from '@/services/errors';
import { updateUserCountry } from '@/services/profile';

export type WatchProviderActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function updateUserCountryAction(
  country: string
): Promise<WatchProviderActionResult> {
  try {
    await updateUserCountry(country);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: 'Something went wrong' };
  }
}
