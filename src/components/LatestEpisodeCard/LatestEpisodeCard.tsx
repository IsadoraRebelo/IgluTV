'use client';

import { Check } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { EpisodeModal } from '@/components';
import { getDaysUntilAir } from '@/components/ShowTracker/utils';

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

export function LatestEpisodeCard({
  episode,
  cast,
  isWatched,
  isPending,
  onToggleWatched,
  isLoggedIn,
}: {
  episode: LatestEpisode;
  cast: CastMember[];
  isWatched: boolean;
  isPending: boolean;
  onToggleWatched: () => void;
  isLoggedIn: boolean;
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
          <div className="bg-surface relative aspect-square min-h-28 shrink-0 overflow-hidden">
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
            <p className="text-text-secondary text-xs">
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
            <span className="text-text-secondary text-xs">
              In {daysUntilAir} day{daysUntilAir === 1 ? '' : 's'}
            </span>
          ) : !isLoggedIn ? null : (
            <button
              type="button"
              aria-label={
                isWatched
                  ? 'Unmark episode as watched'
                  : 'Mark episode as watched'
              }
              disabled={isPending}
              onClick={onToggleWatched}
              className={`text-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                isWatched ? 'bg-accent' : 'bg-muted-foreground'
              }`}
            >
              <Check className="h-4 w-4 text-white" />
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
          arcName: null,
        }}
        seasonNumber={episode.seasonNumber}
        cast={cast}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
