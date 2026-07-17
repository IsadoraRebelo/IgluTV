'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, Form, FormField, FormInput } from '@/components';

import { deleteAccountFormSchema, DeleteAccountUserInput } from '@/types';

import { deleteAccountAction } from './actions';

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<DeleteAccountUserInput>({
    resolver: zodResolver(deleteAccountFormSchema),
    defaultValues: { currentPassword: '' },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) form.reset({ currentPassword: '' });
  }

  const onSubmitHandler: SubmitHandler<DeleteAccountUserInput> = (values) => {
    startTransition(async () => {
      const result = await deleteAccountAction(values);

      if (!result.ok) {
        if (result.message === 'Incorrect password') {
          form.setError('currentPassword', { message: result.message });
        } else {
          toast.error(result.message);
        }
        return;
      }

      router.push('/');
      router.refresh();
    });
  };

  return (
    <section className="border-destructive/30 flex flex-col gap-3 rounded-md border p-4">
      <div>
        <h2 className="text-destructive text-base font-semibold">
          Danger Zone
        </h2>
        <p className="text-foreground/60 text-sm">
          Permanently delete your profile, watchlist, and watch history. This
          cannot be undone.
        </p>
      </div>

      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <DialogPrimitive.Trigger asChild>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-destructive hover:bg-destructive/90 w-fit text-white"
          >
            Delete my account
          </Button>
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="max-sm:data-[state=open]:animate-fade-in max-sm:data-[state=closed]:animate-fade-out fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content className="max-sm:data-[state=open]:animate-slide-up max-sm:data-[state=closed]:animate-slide-down bg-background border-muted fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col gap-5 overflow-y-auto rounded-t-lg border p-6 shadow-lg sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[90vw] sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
            <div className="flex items-center justify-between">
              <DialogPrimitive.Title className="text-foreground text-lg font-semibold">
                Delete account
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
              Enter your password to permanently delete your account. This
              cannot be undone.
            </DialogPrimitive.Description>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitHandler)}
                className="flex flex-col gap-4"
              >
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormInput
                      variant="secondary"
                      label="Current password"
                      type="password"
                      placeholder="•••••••"
                      {...field}
                    />
                  )}
                />
                <Button
                  variant="default"
                  size="sm"
                  type="submit"
                  disabled={isPending}
                  className="bg-destructive hover:bg-destructive/90 w-full text-white"
                >
                  {isPending ? 'Deleting…' : 'Delete my account'}
                </Button>
              </form>
            </Form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </section>
  );
}
