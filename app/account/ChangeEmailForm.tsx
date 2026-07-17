'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, Form, FormField, FormInput } from '@/components';

import { changeEmailFormSchema, ChangeEmailUserInput } from '@/types';

import { changeEmailAction } from './actions';

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ChangeEmailUserInput>({
    resolver: zodResolver(changeEmailFormSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  const onSubmitHandler: SubmitHandler<ChangeEmailUserInput> = (values) => {
    startTransition(async () => {
      const result = await changeEmailAction(values);

      if (!result.ok) {
        if (result.message === 'Incorrect password') {
          form.setError('currentPassword', { message: result.message });
        } else {
          toast.error(result.message);
        }
        return;
      }

      toast.success('Confirmation email sent to your new address');
      form.reset({ newEmail: '', currentPassword: '' });
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-foreground text-base font-semibold">Email</h2>
        <p className="text-foreground/60 text-sm">
          Current email: <span className="text-foreground">{currentEmail}</span>
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmitHandler)}
          className="flex flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="newEmail"
            render={({ field }) => (
              <FormInput
                variant="secondary"
                label="New email"
                placeholder="you@example.com"
                {...field}
              />
            )}
          />
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
            variant="primary"
            size="sm"
            type="submit"
            disabled={isPending}
            className="w-fit"
          >
            {isPending ? 'Saving…' : 'Update email'}
          </Button>
        </form>
      </Form>
    </section>
  );
}
