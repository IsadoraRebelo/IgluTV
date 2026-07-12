'use client';

import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import {
  EpisodeModal,
  ShowTrackingProvider,
  useShowTrackingContext,
  WatchedToggleButton,
} from '@/components';

import {
  episodeKey,
  getRewatchCount,
  getWatchCount,
} from '@/components/ShowTracker/utils';

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
  faded?: boolean;
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
    faded,
  } = props;

  return (
    <ShowTrackingProvider
      showId={showId}
      seasons={seasons}
      watchedEpisodes={watchedEpisodes}
      skipCatchUpPrompt={skipCatchUpPrompt}
      initialStatus={initialStatus}
      initialIsFavourite={false}
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
        faded={faded}
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
  faded,
}: {
  showId: number;
  showName: string;
  episode: LatestEpisode;
  backlogCount: number;
  badge: 'new' | 'premiere' | null;
  cast: CastMember[];
  faded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const {
    onToggleEpisode,
    onRewatchEpisode,
    onRemoveLastEpisodeRewatch,
    pendingKeys,
    watchedDates,
  } = useShowTrackingContext();

  const prevPendingSizeRef = useRef(0);
  useEffect(() => {
    const prevSize = prevPendingSizeRef.current;
    if (prevSize > 0 && pendingKeys.size === 0) {
      setPhase('exiting');
    }
    prevPendingSizeRef.current = pendingKeys.size;
  }, [pendingKeys]);

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

  const episodeKeyValue = episodeKey(
    episode.seasonNumber,
    episode.episodeNumber
  );
  const isPending = pendingKeys.has(episodeKeyValue);
  const isWatched = getWatchCount(watchedDates, episodeKeyValue) > 0;
  const rewatchCount = getRewatchCount(watchedDates, episodeKeyValue);

  const baseRowClassName = `flex cursor-pointer items-stretch overflow-hidden rounded-lg bg-white/[0.03] hover:bg-white/[0.06] ${faded ? 'opacity-60 hover:opacity-100' : ''
    }`;

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
            ? `animate-slide-out-left ${baseRowClassName}`
            : phase === 'entering'
              ? `animate-slide-in-right ${baseRowClassName}`
              : baseRowClassName
        }
      >
        <div className="relative aspect-square w-25 shrink-0 overflow-hidden bg-[#2c3440] sm:w-30">
          {episode.imageUrl ? (
            <Image
              src={episode.imageUrl}
              alt={episode.name}
              fill
              sizes="(min-width: 640px) 160px, 128px"
              className="object-cover"
            />
          ) : null}
          {badge ? (
            <span
              className={
                badge === 'premiere'
                  ? 'absolute top-1 left-1 w-fit rounded-md bg-white px-2 py-0.5 text-xs font-semibold tracking-wide text-[#14181c] uppercase'
                  : 'absolute top-1 left-1 w-fit rounded-md bg-yellow-400 px-2 py-0.5 text-xs font-semibold tracking-wide text-[#14181c] uppercase'
              }
            >
              {badge === 'premiere' ? 'Premiere' : 'New'}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4">
          <Link
            href={`/show/${showId}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex max-w-full items-center gap-1 self-start rounded-full border border-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase"
          >
            <span className="truncate">{showName}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </Link>

          <div>
            <p className="text-sm font-semibold text-accent-foreground pb-1">
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
        </div>

        <div
          className="flex shrink-0 items-center pr-3 pl-1"
          onClick={(event) => event.stopPropagation()}
        >
          <WatchedToggleButton
            isWatched={isWatched}
            isPending={isPending}
            rewatchCount={rewatchCount}
            markLabel="Mark episode as watched"
            rewatchLabel="+1 Rewatched"
            removeLabel="Not watched"
            removeRewatchesLabel="Remove last rewatch"
            onMark={() =>
              onToggleEpisode(episode.seasonNumber, episode.episodeNumber)
            }
            onRewatch={() =>
              onRewatchEpisode(episode.seasonNumber, episode.episodeNumber)
            }
            onRemove={() =>
              onToggleEpisode(episode.seasonNumber, episode.episodeNumber)
            }
            onRemoveRewatches={() =>
              onRemoveLastEpisodeRewatch(
                episode.seasonNumber,
                episode.episodeNumber
              )
            }
          />
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
        closeOnMark
      />
    </>
  );
}
