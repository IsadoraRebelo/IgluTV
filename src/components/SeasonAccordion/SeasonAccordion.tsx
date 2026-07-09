'use client';

import { useState } from 'react';

import Image from 'next/image';
import { Check, ChevronDown } from 'lucide-react';

import { EpisodeModal } from '@/components';
import type { CastMember, Season, SeasonEpisode } from '@/types';

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

export function SeasonAccordion({
  seasons,
  cast,
}: {
  seasons: Season[];
  cast: CastMember[];
}) {
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [selected, setSelected] = useState<{
    episode: SeasonEpisode;
    seasonNumber: number;
  } | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {seasons.map((season) => {
        const isExpanded = expandedSeason === season.seasonNumber;

        return (
          <div
            key={season.seasonNumber}
            className="overflow-hidden rounded-lg bg-white/[0.03]"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-4">
              <button
                type="button"
                onClick={() =>
                  setExpandedSeason(isExpanded ? null : season.seasonNumber)
                }
                className="flex flex-1 items-center gap-3 text-left"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-semibold text-white">
                    {season.name}
                  </span>
                  {formatDate(season.airDate) ? (
                    <span className="text-xs text-[#8a9bab]">
                      {formatDate(season.airDate)}
                    </span>
                  ) : null}
                </div>
                <ChevronDown
                  className={`h-6 w-6 shrink-0 text-[#678] transition-transform duration-300 ease-in-out ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div className="flex items-center gap-3">
                {season.episodeCount ? (
                  <span className="text-sm text-[#8a9bab]">
                    {season.episodeCount}/{season.episodeCount}
                  </span>
                ) : null}
                {/* Decorative for now — not wired to any real watch state. */}
                <button
                  type="button"
                  aria-label="Mark season as watched"
                  className="bg-main flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded-full text-[#14181c]"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <div className="bg-main h-1 w-full" />
                <div className="flex flex-col gap-2 p-2">
                  {season.episodes.map((episode) => {
                    const daysUntilAir = getDaysUntilAir(episode.airDate);

                    return (
                    <div
                      key={episode.episodeNumber}
                      className="flex items-stretch overflow-hidden rounded-md bg-white/[0.03] hover:bg-white/[0.06]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelected({
                            // Not-yet-aired episodes often have no still
                            // image of their own — fall back to the
                            // season's first episode's image so the modal
                            // background isn't blank.
                            episode: {
                              ...episode,
                              imageUrl:
                                episode.imageUrl ??
                                season.episodes[0]?.imageUrl ??
                                null,
                            },
                            seasonNumber: season.seasonNumber,
                          })
                        }
                        className="flex min-w-0 flex-1 items-stretch gap-3 text-left"
                      >
                        <div className="relative aspect-square shrink-0 overflow-hidden bg-[#2c3440]">
                          {episode.imageUrl ? (
                            <Image
                              src={episode.imageUrl}
                              alt={episode.name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2">
                          <p className="text-sm font-semibold text-white">
                            S{String(season.seasonNumber).padStart(2, '0')} | E
                            {String(episode.episodeNumber).padStart(2, '0')}
                          </p>
                          <p className="truncate text-sm text-[#c2d0dd]">
                            {episode.name}
                          </p>
                          {formatDate(episode.airDate) ? (
                            <p className="text-xs text-[#678]">
                              {formatDate(episode.airDate)}
                            </p>
                          ) : null}
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center pr-3 pl-2">
                        {daysUntilAir !== null ? (
                          <span className="w-16 text-right text-xs text-[#8a9bab]">
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
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <EpisodeModal
        episode={selected?.episode ?? null}
        seasonNumber={selected?.seasonNumber ?? 0}
        cast={cast}
        open={selected !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelected(null);
        }}
      />
    </div>
  );
}
