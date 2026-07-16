'use client';

import { useRouter } from 'next/navigation';
import { forwardRef, useTransition } from 'react';
import { toast } from 'sonner';

import { cn, signOut } from '@/utils';

export const LogOutButton = forwardRef<
  HTMLButtonElement,
  { className?: string }
>(({ className }, ref) => {
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
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={cn(
        'text-destructive text-sm underline disabled:opacity-50',
        className
      )}
    >
      {isPending ? '...' : 'Log out'}
    </button>
  );
});
LogOutButton.displayName = 'LogOutButton';
