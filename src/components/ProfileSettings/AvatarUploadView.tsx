'use client';

import { ArrowUturnLeftIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { uploadAvatarAction } from './actions';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 30 * 1024 * 1024;

export function AvatarUploadView({
  currentAvatarUrl,
  onCancel,
  onApplied,
}: {
  currentAvatarUrl: string | null;
  onCancel: () => void;
  onApplied: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be smaller than 30MB');
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      const result = await uploadAvatarAction(formData);

      if (!result.ok) {
        toast.error(result.message);
        setPreviewUrl(currentAvatarUrl);
        return;
      }

      toast.success('Profile picture updated');
      onApplied();
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex shrink-0 items-center justify-center px-4 py-3 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="text-text-secondary absolute left-4 top-1/2 -translate-y-1/2 text-sm hover:text-white"
        >
          <ArrowUturnLeftIcon className="h-4 w-4" />
        </button>
        <h2 className="text-muted-foreground text-center text-xs font-semibold uppercase">
          Profile picture
        </h2>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 p-6">
        <div className="bg-surface relative h-32 w-32 shrink-0 overflow-hidden rounded-full">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Profile picture preview"
              fill
              sizes="128px"
              className="object-cover"
              unoptimized={previewUrl.startsWith('blob:')}
            />
          ) : null}
        </div>

        <label className="text-text-secondary cursor-pointer text-sm hover:text-white">
          <span className="underline">
            {isPending ? 'Uploading…' : 'Choose an image'}
          </span>
          <input
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            className="sr-only"
            disabled={isPending}
            onChange={handleFileChange}
          />
        </label>

        <p className="text-text-secondary text-center text-xs">
          Your picture should be a square image, at least 300 x 300px.
        </p>
      </div>
    </div>
  );
}
