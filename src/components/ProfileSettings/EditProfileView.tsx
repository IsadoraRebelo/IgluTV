'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="relative flex shrink-0 items-center justify-center px-4 py-3 pt-5">
        <h2 className="text-muted-foreground text-center text-xs font-semibold uppercase">Edit Profile</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1 right-2 flex h-8 w-8 items-center justify-center text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center pb-2 gap-4 px-4">
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
          className="flex items-end gap-2 px-4"
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

      <div className="flex flex-col gap-2 px-4 pb-4">
        <Button
          variant="default"
          size="sm"
          type="button"
          className="text-white bg-transparent w-full hover:text-white flex items-center justify-between rounded-md px-2 py-3 text-sm"
          onClick={onChangeBanner}
        >
          Change banner
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Link
          href="/account"
          onClick={onClose}
          className="text-white hover:text-white flex items-center justify-between rounded-md px-2 py-3 text-sm hover:bg-primary-foreground/95"
        >
          Account settings
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
