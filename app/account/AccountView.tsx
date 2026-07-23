'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { LogOutButton } from '@/components';

import { ChangeEmailForm } from './ChangeEmailForm';
import { ChangePasswordForm } from './ChangePasswordForm';
import { DeleteAccountSection } from './DeleteAccountSection';

export function AccountView({ email }: { email: string }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('emailChanged') === '1') {
      toast.success('Email updated');
    }
  }, [searchParams]);

  return (
    <div className="mx-auto mt-5 flex w-full max-w-md flex-col gap-5 px-4 pb-5 md:mt-10 md:gap-10">
      <h1 className="text-foreground text-xl font-semibold tracking-tight">
        Account
      </h1>

      <ChangeEmailForm currentEmail={email} />
      <ChangePasswordForm />
      <Link
        href="/import"
        className="text-foreground w-fit text-sm underline underline-offset-4"
      >
        Import from TV Time
      </Link>
      <LogOutButton className="w-fit" />
      <DeleteAccountSection />
    </div>
  );
}
