'use client';

import { useState } from 'react';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Image from 'next/image';
import { Check, ChevronDown, RotateCcw, Trash2, Undo2 } from 'lucide-react';

import { EpisodeModal } from '@/components';
import {
  episodeKey,
  getDaysUntilAir,
  getRewatchCount,
  getWatchCount,
} from '@/components/ShowTracker/utils';
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

function WatchedToggleButton({
  isWatched,
  isPending,
  rewatchCount,
  markLabel,
  rewatchLabel,
  removeLabel,
  removeRewatchesLabel,
  onMark,
  onRewatch,
  onRemove,
  onRemoveRewatches,
}: {
  isWatched: boolean;
  isPending: boolean;
  rewatchCount: number;
  markLabel: string;
  rewatchLabel: string;
  removeLabel: string;
  removeRewatchesLabel: string;
  onMark: () => void;
  onRewatch: () => void;
  onRemove: () => void;
  onRemoveRewatches: () => void;
}) {
  const buttonClassName = `flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#14181c] transition-colors disabled:opacity-50 ${
    isWatched ? 'bg-[#66cc24]' : 'bg-main'
  }`;

  if (!isWatched) {
    return (
      <button
        type="button"
        aria-label={markLabel}
        disabled={isPending}
        onClick={onMark}
        className={buttonClassName}
      >
        <Check className="h-4 w-4" />
      </button>
    );
  }

  const triggerLabel =
    rewatchCount > 0
      ? `${markLabel} — rewatched ${rewatchCount} time${rewatchCount === 1 ? '' : 's'} — open options`
      : `${markLabel} — open options`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          disabled={isPending}
          className={buttonClassName}
        >
          {rewatchCount > 0 ? (
            <span className="text-sm font-bold text-white">x{rewatchCount}</span>
          ) : (
            <Check className="h-5 w-5 text-white" />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-48 rounded-lg bg-primary-foreground p-2 shadow-2xl ring-1 ring-white/10
            data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
        >
          <DropdownMenu.Item
            onClick={onRewatch}
            className="cursor-pointer flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] outline-none data-[highlighted]:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" />
            {rewatchLabel}
          </DropdownMenu.Item>
          {rewatchCount > 0 ? (
            <DropdownMenu.Item
              onClick={onRemoveRewatches}
              className="flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] outline-none data-[highlighted]:bg-white/5 cursor-pointer"
            >
              <Undo2 className="h-4 w-4" />
              {removeRewatchesLabel}
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item
            onClick={onRemove}
            className="cursor-pointer flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] outline-none data-[highlighted]:bg-white/5"
          >
            <Trash2 className="h-4 w-4" />
            {removeLabel}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function SeasonAccordion({
  seasons,
  cast,
  watchedDates,
  pendingKeys,
  onToggleEpisode,
  onRewatchEpisode,
  onRemoveLastEpisodeRewatch,
  onToggleSeason,
  onRewatchSeason,
  onRemoveLastSeasonRewatch,
}: {
  seasons: Season[];
  cast: CastMember[];
  watchedDates: Map<string, string[]>;
  pendingKeys: Set<string>;
  onToggleEpisode: (seasonNumber: number, episodeNumber: number) => void;
  onRewatchEpisode: (seasonNumber: number, episodeNumber: number) => void;
  onRemoveLastEpisodeRewatch: (seasonNumber: number, episodeNumber: number) => void;
  onToggleSeason: (season: Season) => void;
  onRewatchSeason: (season: Season) => void;
  onRemoveLastSeasonRewatch: (season: Season) => void;
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
        const total = season.episodeCount ?? season.episodes.length;
        const markableEpisodes = season.episodes.filter(
          (ep) => getDaysUntilAir(ep.airDate) === null
        );
        const seasonWatchedCount = markableEpisodes.filter(
          (ep) =>
            getWatchCount(
              watchedDates,
              episodeKey(season.seasonNumber, ep.episodeNumber)
            ) > 0
        ).length;
        const isSeasonFullyWatched =
          markableEpisodes.length > 0 &&
          seasonWatchedCount === markableEpisodes.length;
        const isSeasonPending = pendingKeys.has(
          `season-${season.seasonNumber}`
        );
        const seasonRewatchCount =
          markableEpisodes.length === 0
            ? 0
            : Math.min(
                ...markableEpisodes.map((ep) =>
                  getRewatchCount(
                    watchedDates,
                    episodeKey(season.seasonNumber, ep.episodeNumber)
                  )
                )
              );

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
                {total ? (
                  <span className="text-sm text-[#8a9bab]">
                    {seasonWatchedCount}/{total}
                  </span>
                ) : null}
                <WatchedToggleButton
                  isWatched={isSeasonFullyWatched}
                  isPending={isSeasonPending}
                  rewatchCount={seasonRewatchCount}
                  markLabel="Mark season as watched"
                  rewatchLabel="Add Rewatch"
                  removeLabel="Not Watched"
                  removeRewatchesLabel="Remove Rewatch"
                  onMark={() => onToggleSeason(season)}
                  onRewatch={() => onRewatchSeason(season)}
                  onRemove={() => onToggleSeason(season)}
                  onRemoveRewatches={() => onRemoveLastSeasonRewatch(season)}
                />
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
                    const key = episodeKey(
                      season.seasonNumber,
                      episode.episodeNumber
                    );
                    const isEpisodeWatched =
                      getWatchCount(watchedDates, key) > 0;
                    const episodeRewatchCount = getRewatchCount(
                      watchedDates,
                      key
                    );
                    const isEpisodePending = pendingKeys.has(key);

                    return (
                      <div
                        key={episode.episodeNumber}
                        className="flex items-stretch overflow-hidden rounded-md bg-white/[0.03] hover:bg-white/[0.06]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelected({
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
                            <WatchedToggleButton
                              isWatched={isEpisodeWatched}
                              isPending={isEpisodePending}
                              rewatchCount={episodeRewatchCount}
                              markLabel="Mark episode as watched"
                              rewatchLabel="+1 Rewatched"
                              removeLabel="Not watched"
                              removeRewatchesLabel="Remove last rewatch"
                              onMark={() =>
                                onToggleEpisode(
                                  season.seasonNumber,
                                  episode.episodeNumber
                                )
                              }
                              onRewatch={() =>
                                onRewatchEpisode(
                                  season.seasonNumber,
                                  episode.episodeNumber
                                )
                              }
                              onRemove={() =>
                                onToggleEpisode(
                                  season.seasonNumber,
                                  episode.episodeNumber
                                )
                              }
                              onRemoveRewatches={() =>
                                onRemoveLastEpisodeRewatch(
                                  season.seasonNumber,
                                  episode.episodeNumber
                                )
                              }
                            />
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
