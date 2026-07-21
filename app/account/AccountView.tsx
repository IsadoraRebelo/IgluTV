'use client';

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
    <div className="mx-auto flex w-full mt-5 max-w-md flex-col gap-5 md:gap-10 px-4 pb-5 md:mt-10">
      <h1 className="text-foreground text-xl font-semibold tracking-tight">
        Account
      </h1>

      <ChangeEmailForm currentEmail={email} />
      <ChangePasswordForm />
      <LogOutButton className="w-fit" />
      <DeleteAccountSection />
    </div>
  );
}
