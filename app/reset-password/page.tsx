import { redirect } from 'next/navigation';

import { getViewer } from '@/services/viewer';

import { ResetPasswordForm } from './ResetPasswordForm';

export default async function ResetPasswordPage() {
  const viewer = await getViewer();

  if (!viewer) redirect('/');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Set a new password
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Choose a new password for your account.
        </p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
