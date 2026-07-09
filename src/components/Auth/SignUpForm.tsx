'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, Form, FormField, FormInput } from '@/components';
import { CreateUserInput, signupFormSchema } from '@/types';

import { signUpWithEmailAndPassword } from './actions';

type SignUpFormProps = {
  onSuccess?: () => void;
};

export const SignUpForm = ({ onSuccess }: SignUpFormProps) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { email: '', password: '', name: '', invite_code: '' },
  });

  const onSubmitHandler: SubmitHandler<CreateUserInput> = (values) => {
    startTransition(async () => {
      const { error } = await signUpWithEmailAndPassword({ data: values });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success('Registered successfully');
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormInput variant="secondary" label="Username" {...field} />
          )}
        />
        <FormField
          control={form.control}
          name="invite_code"
          render={({ field }) => (
            <FormInput variant="secondary" label="Invite Code" {...field} />
          )}
        />
        <Button
          className="w-full"
          variant="primary"
          size="sm"
          type="submit"
          disabled={isPending}
        >
          {isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </Form>
  );
};
