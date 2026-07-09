'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import Image from 'next/image';
import { Check, X } from 'lucide-react';

import type { CastMember, SeasonEpisode } from '@/types';

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Returns days until an episode airs, or null if it already aired (or the
// date is unknown) — used to swap the watched button for a countdown.
function getDaysUntilAir(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const airDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(airDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((airDate.getTime() - today.getTime()) / 86_400_000);
  return days > 0 ? days : null;
}

export function EpisodeModal({
  episode,
  seasonNumber,
  cast,
  open,
  onOpenChange,
}: {
  episode: SeasonEpisode | null;
  seasonNumber: number;
  cast: CastMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const daysUntilAir = episode ? getDaysUntilAir(episode.airDate) : null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/70
            max-sm:data-[state=open]:animate-fade-in
            max-sm:data-[state=closed]:animate-fade-out"
        />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] w-full
            overflow-y-auto rounded-t-lg bg-[#14181c] shadow-2xl
            max-sm:data-[state=open]:animate-slide-up
            max-sm:data-[state=closed]:animate-slide-down
            sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-[90vw] sm:max-w-lg
            sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg"
        >
          {episode ? (
            <>
              <div className="relative h-[160px] w-full overflow-hidden rounded-t-lg bg-[#2c3440] sm:h-[220px]">
                {episode.imageUrl ? (
                  <Image
                    src={episode.imageUrl}
                    alt={episode.name}
                    fill
                    sizes="512px"
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/30 to-transparent" />
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              </div>

              <div className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <DialogPrimitive.Title className="text-md font-semibold text-white">
                      S{String(seasonNumber).padStart(2, '0')} | E
                      {String(episode.episodeNumber).padStart(2, '0')}
                    </DialogPrimitive.Title>
                    <p className="text-lg font-semibold text-white">
                      {episode.name}
                    </p>
                    <p className="mt-1 text-xs text-[#8a9bab]">
                      {[
                        formatDate(episode.airDate),
                        episode.runtime ? `${episode.runtime}m` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {daysUntilAir !== null ? (
                    <span className="shrink-0 text-xs text-[#8a9bab]">
                      In {daysUntilAir} day{daysUntilAir === 1 ? '' : 's'}
                    </span>
                  ) : (
                    // Decorative for now — not wired to any real watch state.
                    <button
                      type="button"
                      aria-label="Mark episode as watched"
                      className="bg-main flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded-full text-[#14181c]"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <DialogPrimitive.Description className="text-sm leading-relaxed text-[#c2d0dd]">
                  {episode.overview || 'No description available.'}
                </DialogPrimitive.Description>

                {cast.length > 0 ? (
                  <div className="mt-2">
                    <h3 className="mb-2 text-xs font-semibold tracking-[0.15em] text-[#678] uppercase">
                      Cast
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {cast.map((member) => (
                        <div
                          key={`${member.actorName}-${member.character}`}
                          className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-md bg-[#2c3440]"
                        >
                          {member.imageUrl ? (
                            <Image
                              src={member.imageUrl}
                              alt={member.actorName}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : null}
                          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />
                          <div className="absolute right-0 bottom-0 left-0 p-2">
                            <div className="truncate text-xs font-semibold text-white">
                              {member.actorName}
                            </div>
                            <div className="truncate text-[10px] tracking-wide text-white/70 uppercase">
                              {member.character}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
