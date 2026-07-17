'use client';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentAvatarUrl
  );

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
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-[#8a9bab] hover:text-white"
        >
          Cancel
        </button>
        <h2 className="text-base font-semibold text-white">
          Profile picture
        </h2>
        <span className="w-12" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 p-6">
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full bg-[#2c3440]">
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

        <label className="cursor-pointer text-sm text-[#8a9bab] hover:text-white">
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

        <p className="text-center text-xs text-[#8a9bab]">
          Your picture should be a square image, at least 300 x 300px.
        </p>
      </div>
    </div>
  );
}
