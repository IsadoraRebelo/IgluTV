'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, Form, FormField, FormInput } from '@/components';

import {
  changeAccountPasswordFormSchema,
  ChangeAccountPasswordUserInput,
} from '@/types';

import { changePasswordAction } from './actions';

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ChangeAccountPasswordUserInput>({
    resolver: zodResolver(changeAccountPasswordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const onSubmitHandler: SubmitHandler<ChangeAccountPasswordUserInput> = (
    values
  ) => {
    startTransition(async () => {
      const result = await changePasswordAction(values);

      if (!result.ok) {
        if (result.message === 'Incorrect password') {
          form.setError('currentPassword', { message: result.message });
        } else {
          toast.error(result.message);
        }
        return;
      }

      toast.success('Password updated');
      form.reset({ currentPassword: '', newPassword: '' });
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-foreground text-base font-semibold">Password</h2>

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
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormInput
                variant="secondary"
                label="New password"
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
            {isPending ? 'Saving…' : 'Update password'}
          </Button>
        </form>
      </Form>
    </section>
  );
}
