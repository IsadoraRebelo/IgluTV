'use client';

import { ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ShowBackdropImage } from '@/types';

import {
  type BannerShowOption,
  getShowBackdropsAction,
  updateBannerAction,
} from './actions';

export function BannerImagesView({
  show,
  onBack,
  onApplied,
}: {
  show: BannerShowOption;
  onBack: () => void;
  onApplied: () => void;
}) {
  const [images, setImages] = useState<ShowBackdropImage[] | null>(null);
  const [savingPath, setSavingPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getShowBackdropsAction(show.id)
      .then((result) => {
        if (!cancelled) setImages(result);
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [show.id]);

  async function handleSelect(image: ShowBackdropImage) {
    setSavingPath(image.filePath);
    const result = await updateBannerAction(image.fullUrl);

    if (!result.ok) {
      toast.error(result.message);
      setSavingPath(null);
      return;
    }

    toast.success('Banner updated');
    onApplied();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to shows"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="truncate text-base font-semibold text-white">
          {show.name}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {images === null ? (
          <p className="text-text-secondary text-sm">Loading images…</p>
        ) : images.length === 0 ? (
          <p className="text-text-secondary text-sm">
            No banner images available for this show.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {images.map((image) => (
              <button
                key={image.filePath}
                type="button"
                disabled={savingPath !== null}
                onClick={() => handleSelect(image)}
                aria-label={`Use this ${show.name} image as your banner`}
                className="bg-surface relative aspect-video overflow-hidden rounded-md disabled:opacity-50"
              >
                <Image
                  src={image.thumbnailUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 45vw, 220px"
                  className="object-cover"
                />
                {savingPath === image.filePath ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-xs text-white">Saving…</span>
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
