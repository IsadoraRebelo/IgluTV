'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { signOut } from '@/utils';

export const LogOutButton = () => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    startTransition(async () => {
      try {
        await signOut();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Something went wrong trying to log out'
        );
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="text-destructive text-sm underline disabled:opacity-50"
    >
      {isPending ? '...' : 'Log out'}
    </button>
  );
};
