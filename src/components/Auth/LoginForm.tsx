'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, Form, FormField, FormInput } from '@/components';
import { LoginUserInput, loginFormSchema } from '@/types';

import { loginWithEmailAndPassword } from './actions';

type LoginFormProps = {
  onSuccess?: () => void;
};

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<LoginUserInput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmitHandler: SubmitHandler<LoginUserInput> = (values) => {
    startTransition(async () => {
      const { error } = await loginWithEmailAndPassword({ data: values });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success('Logged in successfully');
      router.refresh();
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormInput
              variant="secondary"
              label="Password"
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
          {isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </Form>
  );
};
