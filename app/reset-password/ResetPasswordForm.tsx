'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, Form, FormField, FormInput } from '@/components';
import { PasswordUserInput, changePasswordFormSchema } from '@/types';

import { updatePasswordAction } from './actions';

export const ResetPasswordForm = () => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<PasswordUserInput>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { password: '' },
  });

  const onSubmitHandler: SubmitHandler<PasswordUserInput> = (values) => {
    startTransition(async () => {
      const { error } = await updatePasswordAction({ data: values });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success('Password updated');
      router.push('/');
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmitHandler)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="password"
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
          className="w-full"
          variant="primary"
          size="sm"
          type="submit"
          disabled={isPending}
        >
          {isPending ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </Form>
  );
};
