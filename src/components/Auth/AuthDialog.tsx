'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components';

import { LoginForm } from './LoginForm';
import { RecoverForm } from './RecoverForm';
import { SignUpForm } from './SignUpForm';

type AuthView = 'login' | 'signup' | 'recover';

const VIEW_COPY: Record<AuthView, { title: string; description: string }> = {
  login: { title: 'Welcome back', description: 'Sign in to your account' },
  signup: { title: 'Get started', description: 'Create a new account' },
  recover: {
    title: 'Recover account',
    description: 'Provide your email to get a recovery link',
  },
};

export const AuthDialog = () => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AuthView>('login');

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setView('login');
  };

  const handleSuccess = () => setOpen(false);

  const { title, description } = VIEW_COPY[view];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="primary" size="sm">
          Log in
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content className="bg-background border-muted fixed top-1/2 left-1/2 z-50 flex w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-lg border p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-foreground text-lg font-semibold">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="text-muted-foreground text-sm">
            {description}
          </DialogPrimitive.Description>

          {view === 'login' && <LoginForm onSuccess={handleSuccess} />}
          {view === 'signup' && <SignUpForm onSuccess={handleSuccess} />}
          {view === 'recover' && <RecoverForm onSuccess={handleSuccess} />}

          <div className="flex flex-col items-center gap-1 text-sm">
            {view === 'login' && (
              <>
                <button
                  type="button"
                  className="underline"
                  onClick={() => setView('recover')}
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  className="underline"
                  onClick={() => setView('signup')}
                >
                  Don&apos;t have an account? Create one
                </button>
              </>
            )}
            {view === 'signup' && (
              <button
                type="button"
                className="underline"
                onClick={() => setView('login')}
              >
                Have an account? Sign in
              </button>
            )}
            {view === 'recover' && (
              <button
                type="button"
                className="underline"
                onClick={() => setView('login')}
              >
                Go back to login
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
