'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, Form, FormField, FormInput } from '@/components';
import { RecoverPasswordUserInput, recoverPasswordFormSchema } from '@/types';

import { recoverPasswordWithEmail } from './actions';

type RecoverFormProps = {
  onSuccess?: () => void;
};

export const RecoverForm = ({ onSuccess }: RecoverFormProps) => {
  const [isPending, startTransition] = useTransition();

  const form = useForm<RecoverPasswordUserInput>({
    resolver: zodResolver(recoverPasswordFormSchema),
    defaultValues: { email: '' },
  });

  const onSubmitHandler: SubmitHandler<RecoverPasswordUserInput> = (
    values
  ) => {
    startTransition(async () => {
      const { error } = await recoverPasswordWithEmail({ data: values });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success('Recovery email sent');
      onSuccess?.();
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
          name="email"
          render={({ field }) => (
            <FormInput
              variant="secondary"
              placeholder="you@example.com"
              label="Email"
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
          {isPending ? 'Sending...' : 'Send recovery email'}
        </Button>
      </form>
    </Form>
  );
};
