'use client';

import { Check, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import {
  EpisodeModal,
  ShowTrackingProvider,
  useShowTrackingContext,
} from '@/components';

import { episodeKey } from '@/components/ShowTracker/utils';

import type {
  CastMember,
  EpisodeWatch,
  LatestEpisode,
  Season,
  ShowStatus,
} from '@/types';

export function WatchListRow(props: {
  showId: number;
  showName: string;
  episode: LatestEpisode;
  backlogCount: number;
  badge: 'new' | 'premiere' | null;
  seasons: Season[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
  cast: CastMember[];
}) {
  const {
    showId,
    showName,
    episode,
    backlogCount,
    badge,
    seasons,
    watchedEpisodes,
    skipCatchUpPrompt,
    initialStatus,
    tmdbStatus,
    cast,
  } = props;

  return (
    <ShowTrackingProvider
      showId={showId}
      seasons={seasons}
      watchedEpisodes={watchedEpisodes}
      skipCatchUpPrompt={skipCatchUpPrompt}
      initialStatus={initialStatus}
      tmdbStatus={tmdbStatus}
      isLoggedIn
    >
      <WatchListRowContent
        showId={showId}
        showName={showName}
        episode={episode}
        backlogCount={backlogCount}
        badge={badge}
        cast={cast}
      />
    </ShowTrackingProvider>
  );
}

function WatchListRowContent({
  showId,
  showName,
  episode,
  backlogCount,
  badge,
  cast,
}: {
  showId: number;
  showName: string;
  episode: LatestEpisode;
  backlogCount: number;
  badge: 'new' | 'premiere' | null;
  cast: CastMember[];
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const { onToggleEpisode, pendingKeys } = useShowTrackingContext();

  // Any tracking mutation started from this row (the quick-mark button below,
  // or the same "mark watched" button inside the EpisodeModal) settles by
  // clearing pendingKeys. Once it does, play a slide-out transition; once
  // that finishes, refresh so the server-computed list (which show is caught
  // up, the new next episode, backlog counts, etc.) reflects the change.
  const prevPendingSizeRef = useRef(0);
  useEffect(() => {
    const prevSize = prevPendingSizeRef.current;
    if (prevSize > 0 && pendingKeys.size === 0) {
      setPhase('exiting');
    }
    prevPendingSizeRef.current = pendingKeys.size;
  }, [pendingKeys]);

  // router.refresh() is async — wrapping it in a transition lets us know
  // when the refreshed data has actually landed and re-rendered, instead of
  // resetting the phase immediately (which left the row permanently hidden:
  // the exit animation is `forwards`-filled, so without this it stayed
  // translated off-screen even once fresh content arrived).
  const wasRefreshingRef = useRef(false);
  useEffect(() => {
    if (wasRefreshingRef.current && !isRefreshing) {
      setPhase('entering');
    }
    wasRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  function handleAnimationEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (phase === 'exiting') {
      startTransition(() => {
        router.refresh();
      });
    } else if (phase === 'entering') {
      setPhase('idle');
    }
  }

  const isPending = pendingKeys.has(
    episodeKey(episode.seasonNumber, episode.episodeNumber)
  );

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        onAnimationEnd={handleAnimationEnd}
        className={
          phase === 'exiting'
            ? 'animate-slide-out-left flex cursor-pointer items-stretch overflow-hidden rounded-lg bg-white/[0.03] hover:bg-white/[0.06]'
            : phase === 'entering'
              ? 'animate-slide-in-right flex cursor-pointer items-stretch overflow-hidden rounded-lg bg-white/[0.03] hover:bg-white/[0.06]'
              : 'flex cursor-pointer items-stretch overflow-hidden rounded-lg bg-white/[0.03] hover:bg-white/[0.06]'
        }
      >
        <div className="relative aspect-square w-32 shrink-0 overflow-hidden bg-[#2c3440] sm:w-40">
          {episode.imageUrl ? (
            <Image
              src={episode.imageUrl}
              alt={episode.name}
              fill
              sizes="(min-width: 640px) 160px, 128px"
              className="object-cover"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-3">
          <Link
            href={`/show/${showId}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex w-fit items-center gap-1 self-start rounded-full border border-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase"
          >
            {showName}
            <ChevronRight className="h-3 w-3" />
          </Link>

          <div>
            <p className="text-sm font-semibold text-white">
              S{String(episode.seasonNumber).padStart(2, '0')} | E
              {String(episode.episodeNumber).padStart(2, '0')}
              {backlogCount > 0 ? (
                <span className="ml-1 text-xs font-normal text-[#8a9bab]">
                  +{backlogCount}
                </span>
              ) : null}
            </p>
            <p className="truncate text-sm text-[#c2d0dd]">{episode.name}</p>
          </div>

          {badge ? (
            <span
              className={
                badge === 'premiere'
                  ? 'w-fit rounded-md bg-white px-2 py-0.5 text-xs font-semibold tracking-wide text-[#14181c] uppercase'
                  : 'w-fit rounded-md bg-yellow-400 px-2 py-0.5 text-xs font-semibold tracking-wide text-[#14181c] uppercase'
              }
            >
              {badge === 'premiere' ? 'Premiere' : 'New'}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center pr-3 pl-1">
          <button
            type="button"
            aria-label="Mark episode as watched"
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              onToggleEpisode(episode.seasonNumber, episode.episodeNumber);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors disabled:opacity-50"
          >
            <Check className="h-4 w-4 text-white" />
          </button>
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
