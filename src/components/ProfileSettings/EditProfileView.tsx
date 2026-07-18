'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, Form, FormField, FormInput } from '@/components';

import { profileSettingsFormSchema, type ProfileSettingsInput } from '@/types';

import { updateUsernameAction } from './actions';

export function EditProfileView({
  username,
  avatarUrl,
  bannerUrl,
  onClose,
  onChangeBanner,
  onChangePicture,
}: {
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  onClose: () => void;
  onChangeBanner: () => void;
  onChangePicture: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<ProfileSettingsInput>({
    resolver: zodResolver(profileSettingsFormSchema),
    defaultValues: { username },
  });

  const onSubmitHandler: SubmitHandler<ProfileSettingsInput> = (values) => {
    startTransition(async () => {
      const result = await updateUsernameAction(values.username);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success('Username updated');
      router.push(`/profile/${values.username}`);
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Edit Profile</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="bg-surface relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={username}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-white">
              {username.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">Profile picture</p>
          <button
            type="button"
            onClick={onChangePicture}
            className="text-text-secondary text-xs underline hover:text-white"
          >
            Change picture
          </button>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmitHandler)}
          className="flex items-end gap-2"
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormInput
                variant="secondary"
                label="Username"
                className="flex-1"
                {...field}
              />
            )}
          />
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isPending || !form.formState.isDirty}
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </Form>

      <div className="flex items-center justify-between gap-4">
        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-[#1c2733] to-[#0b1319]">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : null}
        </div>
        <Button
          variant="default"
          size="sm"
          type="button"
          className="flex-1"
          onClick={onChangeBanner}
        >
          Change banner
        </Button>
      </div>
    </div>
  );
}
