import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const signupFormSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
  name: z
    .string()
    .trim()
    .min(3, { message: 'Username must contain at least 3 characters' })
    .max(20, { message: 'Username can have a max of 20 characters' })
    .regex(/^[a-zA-Z\s]*$/, { message: 'Username can only contain letters' }),
  invite_code: z
    .string()
    .trim()
    .min(1, { message: 'You need an invite code to be able to join' }),
});

export const recoverPasswordFormSchema = z.object({
  email: z.email(),
});

export type LoginUserInput = z.TypeOf<typeof loginFormSchema>;
export type CreateUserInput = z.TypeOf<typeof signupFormSchema>;
export type RecoverPasswordUserInput = z.TypeOf<
  typeof recoverPasswordFormSchema
>;

export const changePasswordFormSchema = z.object({
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
});

export type PasswordUserInput = z.TypeOf<typeof changePasswordFormSchema>;
