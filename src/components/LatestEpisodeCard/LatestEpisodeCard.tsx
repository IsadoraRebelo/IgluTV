'use client';

import { useState } from 'react';

import Image from 'next/image';
import { Check } from 'lucide-react';

import { EpisodeModal } from '@/components';
import type { CastMember, LatestEpisode } from '@/types';

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

export function LatestEpisodeCard({
  episode,
  cast,
}: {
  episode: LatestEpisode;
  cast: CastMember[];
}) {
  const [open, setOpen] = useState(false);
  const daysUntilAir = getDaysUntilAir(episode.airDate);

  return (
    <>
      <div className="flex items-stretch overflow-hidden rounded-md bg-white/[0.03] hover:bg-white/[0.06]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-w-0 flex-1 items-stretch gap-4 text-left"
        >
          <div className="relative aspect-square min-h-28 shrink-0 overflow-hidden bg-[#2c3440]">
            {episode.imageUrl ? (
              <Image
                src={episode.imageUrl}
                alt={episode.name}
                fill
                sizes="150px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2">
            <p className="font-medium text-white">{episode.name}</p>
            <p className="text-xs text-[#8a9bab]">
              {[
                `S${String(episode.seasonNumber).padStart(2, '0')} E${String(
                  episode.episodeNumber
                ).padStart(2, '0')}`,
                formatDate(episode.airDate),
                episode.runtime ? `${episode.runtime}m` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center pr-3 pl-2">
          {daysUntilAir !== null ? (
            <span className="text-xs text-[#8a9bab]">
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
      </div>

      <EpisodeModal
        episode={{
          episodeNumber: episode.episodeNumber,
          name: episode.name,
          overview: episode.overview,
          runtime: episode.runtime,
          airDate: episode.airDate,
          imageUrl: episode.imageUrl,
        }}
        seasonNumber={episode.seasonNumber}
        cast={cast}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
