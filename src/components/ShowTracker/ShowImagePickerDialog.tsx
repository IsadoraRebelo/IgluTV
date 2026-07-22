'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ShowBackdropImage, ShowImageKind } from '@/types';

import { getShowImageOptionsAction, setCustomShowImageAction } from './actions';

export function ShowImagePickerDialog({
  open,
  onOpenChange,
  showId,
  showName,
  kind,
  currentUrl,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId: number;
  showName: string;
  kind: ShowImageKind;
  currentUrl: string | null;
  onApplied: (url: string | null) => void;
}) {
  const [images, setImages] = useState<ShowBackdropImage[] | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImages(null);
      setSavingKey(null);
      return;
    }

    let cancelled = false;
    getShowImageOptionsAction(showId, kind)
      .then((result) => {
        if (!cancelled) setImages(result);
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, showId, kind]);

  async function handleSelect(url: string | null, key: string) {
    setSavingKey(key);
    const result = await setCustomShowImageAction(showId, kind, url);

    if (!result.ok) {
      toast.error(result.message);
      setSavingKey(null);
      return;
    }

    onApplied(url);
  }

  const title = kind === 'poster' ? 'Change poster' : 'Change banner';
  const emptyMessage =
    kind === 'poster'
      ? 'No poster images available for this show.'
      : 'No banner images available for this show.';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="max-sm:data-[state=open]:animate-fade-in max-sm:data-[state=closed]:animate-fade-out fixed inset-0 z-50 bg-black/70" />
        <DialogPrimitive.Content className="max-sm:data-[state=open]:animate-slide-up max-sm:data-[state=closed]:animate-slide-down bg-muted/90 fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-lg shadow-2xl max-sm:pb-[env(safe-area-inset-bottom)] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-md">
          <div className="relative flex shrink-0 items-center justify-center px-4 py-3 pt-5">
            <DialogPrimitive.Title className="text-muted-foreground text-center text-xs font-semibold uppercase">
              {title}
            </DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Pick a {kind} for {showName}
          </DialogPrimitive.Description>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <button
              type="button"
              disabled={savingKey !== null || currentUrl === null}
              onClick={() => handleSelect(null, 'reset')}
              className="text-text-primary mb-3 flex w-full items-center justify-center gap-2 rounded-md bg-white/5 px-3 py-2.5 text-sm hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {savingKey === 'reset' ? 'Resetting…' : 'Reset to default'}
            </button>

            {images === null ? (
              <p className="text-text-secondary text-sm">Loading images…</p>
            ) : images.length === 0 ? (
              <p className="text-text-secondary text-sm">{emptyMessage}</p>
            ) : (
              <div
                className={
                  kind === 'poster'
                    ? 'grid grid-cols-3 gap-2'
                    : 'grid grid-cols-2 gap-2'
                }
              >
                {images.map((image) => (
                  <button
                    key={image.filePath}
                    type="button"
                    disabled={savingKey !== null}
                    onClick={() => handleSelect(image.fullUrl, image.filePath)}
                    aria-label={`Use this ${showName} image`}
                    className={
                      kind === 'poster'
                        ? 'bg-surface relative aspect-[2/3] overflow-hidden rounded-sm disabled:opacity-50'
                        : 'bg-surface relative aspect-video overflow-hidden rounded-md disabled:opacity-50'
                    }
                  >
                    <Image
                      src={image.thumbnailUrl}
                      alt=""
                      fill
                      sizes={
                        kind === 'poster'
                          ? '(max-width: 640px) 30vw, 140px'
                          : '(max-width: 640px) 45vw, 220px'
                      }
                      className="object-cover"
                    />
                    {savingKey === image.filePath ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-xs text-white">Saving…</span>
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
