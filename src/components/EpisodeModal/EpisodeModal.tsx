'use client';

import { CalendarDaysIcon } from '@heroicons/react/24/solid';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronDown, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { WatchedToggleButton } from '@/components';
import { useShowTrackingContext } from '@/components/ShowTracker/ShowTrackingContext';
import {
  episodeKey,
  getDaysUntilAir,
  getWatchedDates,
} from '@/components/ShowTracker/utils';

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

function formatDateOrUnknown(dateStr: string | null): string {
  return formatDate(dateStr) ?? 'Date unknown';
}

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function EpisodeModal({
  episode,
  seasonNumber,
  cast,
  castLoading = false,
  open,
  onOpenChange,
  closeOnMark = false,
}: {
  episode: SeasonEpisode | null;
  seasonNumber: number;
  cast: CastMember[];
  // True while a lazy season/cast load is in flight (tracking page rows
  // only — see ShowTrackingProvider.onLoadSeasons). Every other caller
  // already has cast up front and leaves this false.
  castLoading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeOnMark?: boolean;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const {
    watchedDates,
    pendingKeys,
    onToggleEpisode,
    onRewatchEpisode,
    onRemoveLastEpisodeRewatch,
    onUpdateEpisodeWatchDate,
    isLoggedIn,
  } = useShowTrackingContext();

  const daysUntilAir = episode ? getDaysUntilAir(episode.airDate) : null;
  const episodeNumber = episode ? episode.episodeNumber : null;
  const key = episode ? episodeKey(seasonNumber, episode.episodeNumber) : null;
  const episodeWatchDates =
    key !== null ? getWatchedDates(watchedDates, key) : [];
  const isWatched = episodeWatchDates.length > 0;
  const rewatchCount = Math.max(0, episodeWatchDates.length - 1);
  const isPending = key !== null && pendingKeys.has(key);

  function handleDateInputCommit(index: number, value: string) {
    setEditingIndex(null);
    if (!value || episodeNumber === null) return;
    const previousDate = episodeWatchDates[index];
    if (value === previousDate) return;
    onUpdateEpisodeWatchDate(seasonNumber, episodeNumber, previousDate, value);
  }

  function handleClearDate(index: number) {
    setEditingIndex(null);
    if (episodeNumber === null) return;
    const previousDate = episodeWatchDates[index];
    if (previousDate === null) return;
    onUpdateEpisodeWatchDate(seasonNumber, episodeNumber, previousDate, null);
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setHistoryOpen(false);
          setEditingIndex(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="max-sm:data-[state=open]:animate-fade-in max-sm:data-[state=closed]:animate-fade-out fixed inset-0 z-50 bg-black/70" />
        <DialogPrimitive.Content className="max-sm:data-[state=open]:animate-slide-up max-sm:data-[state=closed]:animate-slide-down bg-background fixed inset-x-0 bottom-0 z-50 max-h-[85vh] w-full overflow-y-auto rounded-t-lg shadow-2xl max-sm:pb-[env(safe-area-inset-bottom)] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[90vw] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
          {episode ? (
            <>
              <div className="bg-surface relative h-[160px] w-full overflow-hidden rounded-t-lg sm:h-[220px]">
                {episode.imageUrl ? (
                  <Image
                    src={episode.imageUrl}
                    alt={episode.name}
                    fill
                    sizes="512px"
                    className="object-cover"
                  />
                ) : null}
                <div className="from-background via-background/30 absolute inset-0 bg-gradient-to-t to-transparent" />
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              </div>

              <div className="relative z-50 mt-[-1.5rem] flex flex-col gap-3 p-5 pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <DialogPrimitive.Title className="text-white text-sm font-semibold">
                      S{String(seasonNumber).padStart(2, '0')} | E
                      {String(episode.episodeNumber).padStart(2, '0')}
                    </DialogPrimitive.Title>
                    <p className="text-lg font-semibold text-white">
                      {episode.name}
                    </p>
                    <p className="text-text-secondary mt-1 text-xs">
                      {[
                        formatDate(episode.airDate),
                        episode.runtime ? `${episode.runtime}m` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {isWatched ? (
                      <div className="mt-1">
                        {episodeWatchDates.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => setHistoryOpen((prev) => !prev)}
                            className="text-text-secondary mt-4 flex items-center gap-1 text-sm"
                          >
                            <div className="flex items-center gap-1">
                              <CalendarDaysIcon className="h-5 w-5" />{' '}
                              {episodeWatchDates.length}× first{' '}
                              {formatDateOrUnknown(episodeWatchDates[0])}
                            </div>
                            <ChevronDown
                              className={`h-3 w-3 transition-transform ${historyOpen ? 'rotate-180' : ''
                                }`}
                            />
                          </button>
                        ) : editingIndex === 0 ? (
                          <div className="flex flex-col items-start gap-1">
                            <input
                              type="date"
                              autoFocus
                              defaultValue={episodeWatchDates[0] ?? undefined}
                              max={todayIso()}
                              onBlur={(event) =>
                                handleDateInputCommit(0, event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Escape')
                                  setEditingIndex(null);
                              }}
                              className="text-text-primary rounded border border-white/10 bg-white/5 px-1 py-0.5 text-xs"
                            />
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleClearDate(0)}
                              className="text-text-faint text-[10px] underline decoration-dotted underline-offset-2 hover:text-white"
                            >
                              I don&apos;t remember the date
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setEditingIndex(0)}
                            className="text-text-secondary mt-4 text-sm underline decoration-dotted underline-offset-2 hover:text-white disabled:pointer-events-none disabled:opacity-50"
                          >
                            <div className="flex items-center gap-1">
                              <CalendarDaysIcon className="h-5 w-5" />{' '}
                              {formatDateOrUnknown(episodeWatchDates[0])}
                            </div>
                          </button>
                        )}
                        {episodeWatchDates.length > 1 ? (
                          <div
                            className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${historyOpen
                              ? 'grid-rows-[1fr]'
                              : 'grid-rows-[0fr]'
                              }`}
                          >
                            <ul className="mt-1 flex flex-col gap-0.5 overflow-hidden pl-1">
                              {episodeWatchDates.map((date, index) =>
                                editingIndex === index ? (
                                  <li
                                    key={`${date}-${index}`}
                                    className="flex flex-col items-start gap-1"
                                  >
                                    <input
                                      type="date"
                                      autoFocus
                                      defaultValue={date ?? undefined}
                                      max={todayIso()}
                                      onBlur={(event) =>
                                        handleDateInputCommit(
                                          index,
                                          event.target.value
                                        )
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === 'Escape') {
                                          setEditingIndex(null);
                                        }
                                      }}
                                      className="text-text-primary rounded border border-white/10 bg-white/5 px-1 py-0.5 text-xs"
                                    />
                                    <button
                                      type="button"
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      onClick={() => handleClearDate(index)}
                                      className="text-text-faint text-[10px] underline decoration-dotted underline-offset-2 hover:text-white"
                                    >
                                      I don&apos;t remember the date
                                    </button>
                                  </li>
                                ) : (
                                  <li key={`${date}-${index}`}>
                                    <button
                                      type="button"
                                      disabled={isPending}
                                      onClick={() => setEditingIndex(index)}
                                      className="text-text-faint text-xs underline decoration-dotted underline-offset-2 hover:text-white disabled:pointer-events-none disabled:opacity-50"
                                    >
                                      {formatDateOrUnknown(date)}
                                    </button>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {daysUntilAir !== null ? (
                    <span className="text-text-secondary shrink-0 text-xs">
                      In {daysUntilAir} day{daysUntilAir === 1 ? '' : 's'}
                    </span>
                  ) : !isLoggedIn ? null : (
                    <WatchedToggleButton
                      isWatched={isWatched}
                      isPending={isPending}
                      rewatchCount={rewatchCount}
                      markLabel="Mark episode as watched"
                      rewatchLabel="+1 Rewatched"
                      removeLabel="Not watched"
                      removeRewatchesLabel="Remove last rewatch"
                      onMark={() => {
                        if (episodeNumber === null) return;
                        onToggleEpisode(seasonNumber, episodeNumber);
                        if (closeOnMark) onOpenChange(false);
                      }}
                      onRewatch={() => {
                        if (episodeNumber === null) return;
                        onRewatchEpisode(seasonNumber, episodeNumber);
                      }}
                      onRemove={() => {
                        if (episodeNumber === null) return;
                        onToggleEpisode(seasonNumber, episodeNumber);
                      }}
                      onRemoveRewatches={() => {
                        if (episodeNumber === null) return;
                        onRemoveLastEpisodeRewatch(seasonNumber, episodeNumber);
                      }}
                    />
                  )}
                </div>

                <DialogPrimitive.Description className="text-text-primary text-sm leading-relaxed">
                  {episode.overview || 'No description available.'}
                </DialogPrimitive.Description>

                {castLoading ? (
                  <div className="mt-2">
                    <h3 className="text-text-faint mb-2 text-xs font-semibold tracking-[0.15em] uppercase">
                      Cast
                    </h3>
                    <p className="text-text-faint text-xs">Loading cast…</p>
                  </div>
                ) : cast.length > 0 ? (
                  <div className="mt-2">
                    <h3 className="text-text-faint mb-2 text-xs font-semibold tracking-[0.15em] uppercase">
                      Cast
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {cast.map((member) => (
                        <Link
                          key={`${member.actorName}-${member.character}`}
                          href={`/cast/${member.actorId}`}
                          className="bg-surface relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-md"
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
                        </Link>
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
