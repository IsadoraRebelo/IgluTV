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
  seasons?: Season[] | null;
  cast?: CastMember[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
  faded?: boolean;
}) {
  const {
    showId,
    showName,
    episode,
    backlogCount,
    badge,
    seasons = null,
    cast = [],
    watchedEpisodes,
    skipCatchUpPrompt,
    initialStatus,
    tmdbStatus,
    faded,
  } = props;

  return (
    <ShowTrackingProvider
      showId={showId}
      seasons={seasons}
      cast={cast}
      watchedEpisodes={watchedEpisodes}
      skipCatchUpPrompt={skipCatchUpPrompt}
      initialStatus={initialStatus}
      initialIsFavourite={false}
      initialCustomPosterUrl={null}
      initialCustomBannerUrl={null}
      tmdbStatus={tmdbStatus}
      isLoggedIn
    >
      <WatchListRowContent
        showId={showId}
        showName={showName}
        episode={episode}
        backlogCount={backlogCount}
        badge={badge}
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
  faded,
}: {
  showId: number;
  showName: string;
  episode: LatestEpisode;
  backlogCount: number;
  badge: 'new' | 'premiere' | null;
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
    cast,
    seasonsLoading,
    onLoadSeasons,
  } = useShowTrackingContext();

  // Server-provided props seed the row, but marking an episode from here
  // (rather than from the modal) swaps in the next unwatched episode
  // locally — see handleMarkEpisode — instead of waiting on a full page
  // refresh. Re-synced during render (not an effect) whenever the server
  // sends fresh props, e.g. after the refresh path below runs for
  // unmark/rewatch/caught-up — this is React's documented pattern for
  // resetting state when a prop changes without an extra render pass.
  const [prevEpisode, setPrevEpisode] = useState(episode);
  const [displayEpisode, setDisplayEpisode] = useState(episode);
  if (episode !== prevEpisode) {
    setPrevEpisode(episode);
    setDisplayEpisode(episode);
  }

  const [prevBadge, setPrevBadge] = useState(badge);
  const [displayBadge, setDisplayBadge] = useState(badge);
  if (badge !== prevBadge) {
    setPrevBadge(badge);
    setDisplayBadge(badge);
  }

  const [prevBacklogCount, setPrevBacklogCount] = useState(backlogCount);
  const [displayBacklogCount, setDisplayBacklogCount] = useState(backlogCount);
  if (backlogCount !== prevBacklogCount) {
    setPrevBacklogCount(backlogCount);
    setDisplayBacklogCount(backlogCount);
  }

  // Set right before a mark that resolves with a next episode to display
  // locally, so the pendingKeys effect below skips the usual exit/refresh
  // animation for that one completion. Marking always round-trips to the
  // server first, so by the time handleMarkEpisode's continuation below
  // runs (a microtask) the effect (a deferred passive effect) has not yet
  // fired — see handleMarkEpisode for how this gets resolved either way.
  const skipExitOnMarkRef = useRef(false);

  const prevPendingSizeRef = useRef(0);
  useEffect(() => {
    const prevSize = prevPendingSizeRef.current;
    if (prevSize > 0 && pendingKeys.size === 0) {
      if (skipExitOnMarkRef.current) {
        skipExitOnMarkRef.current = false;
      } else {
        setPhase('exiting');
      }
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

  // Marking from the row (not the modal) swaps the displayed episode for
  // whatever the server says is next, instead of going through the
  // exit/refresh dance below — the mark action already round-trips, so this
  // keeps the optimistic feel without adding a spinner. A null result means
  // the show is now fully caught up, and a failed mark is already reverted
  // by the context; both fall through to today's behaviour unchanged.
  async function handleMarkEpisode() {
    skipExitOnMarkRef.current = true;
    const nextEpisode = await onToggleEpisode(
      displayEpisode.seasonNumber,
      displayEpisode.episodeNumber
    );

    if (nextEpisode === undefined || nextEpisode === null) {
      skipExitOnMarkRef.current = false;
      return;
    }

    setDisplayEpisode(nextEpisode);
    // The badge and backlog count described the episode we just marked,
    // not the one taking its place — clear/decrement rather than show
    // stale values until the next full refresh.
    setDisplayBadge(null);
    setDisplayBacklogCount((prev) => Math.max(0, prev - 1));
  }

  const episodeKeyValue = episodeKey(
    displayEpisode.seasonNumber,
    displayEpisode.episodeNumber
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
        onClick={() => {
          setOpen(true);
          onLoadSeasons();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
            onLoadSeasons();
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
        <div className="bg-surface relative aspect-square w-25 shrink-0 overflow-hidden sm:w-25">
          {displayEpisode.imageUrl ? (
            <Image
              src={displayEpisode.imageUrl}
              alt={displayEpisode.name}
              fill
              sizes="(min-width: 640px) 160px, 128px"
              className="object-cover"
            />
          ) : null}
          {displayBadge ? (
            <span
              className={
                displayBadge === 'premiere'
                  ? 'text-background absolute bottom-1 left-1 w-fit rounded-md bg-white px-2 py-0.5 text-xs font-semibold tracking-wide uppercase'
                  : 'text-background absolute bottom-1 left-1 w-fit rounded-md bg-yellow-400 px-2 py-0.5 text-xs font-semibold tracking-wide uppercase'
              }
            >
              {displayBadge === 'premiere' ? 'Premiere' : 'New'}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-2">
          <Link
            href={`/show/${showId}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex max-w-full items-center gap-1 self-start rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase"
          >
            <span className="truncate">{showName}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </Link>

          <div>
            <p className="font-heading lg:text-md text-base font-extrabold text-white">
              S{String(displayEpisode.seasonNumber).padStart(2, '0')} | E
              {String(displayEpisode.episodeNumber).padStart(2, '0')}
              {displayBacklogCount > 0 ? (
                <span className="text-text-secondary ml-1 text-xs font-normal">
                  +{displayBacklogCount}
                </span>
              ) : null}
            </p>
            <p className="text-text-secondary truncate text-sm">
              {displayEpisode.name}
            </p>
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
            onMark={handleMarkEpisode}
            onRewatch={() =>
              onRewatchEpisode(
                displayEpisode.seasonNumber,
                displayEpisode.episodeNumber
              )
            }
            onRemove={() =>
              onToggleEpisode(
                displayEpisode.seasonNumber,
                displayEpisode.episodeNumber
              )
            }
            onRemoveRewatches={() =>
              onRemoveLastEpisodeRewatch(
                displayEpisode.seasonNumber,
                displayEpisode.episodeNumber
              )
            }
          />
        </div>
      </div>

      <EpisodeModal
        episode={{
          episodeNumber: displayEpisode.episodeNumber,
          name: displayEpisode.name,
          overview: displayEpisode.overview,
          runtime: displayEpisode.runtime,
          airDate: displayEpisode.airDate,
          imageUrl: displayEpisode.imageUrl,
          arcName: null,
        }}
        seasonNumber={displayEpisode.seasonNumber}
        cast={cast}
        castLoading={seasonsLoading}
        open={open}
        onOpenChange={setOpen}
        closeOnMark
      />
    </>
  );
}
