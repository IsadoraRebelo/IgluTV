'use client';

import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import {
  EpisodeModal,
  ShowTrackingProvider,
  useShowTrackingContext,
} from '@/components';

import type {
  CastMember,
  EpisodeWatch,
  Season,
  SeasonEpisode,
  ShowStatus,
} from '@/types';

export function TrackingUpcomingRow(props: {
  showId: number;
  showName: string;
  posterUrl: string | null;
  network: string | null;
  seasonNumber: number;
  episode: SeasonEpisode;
  daysUntilAir: number;
  daysLabel: string;
  // Omitted (or null) — these rows only ever fetch a show's next episode,
  // so seasons/cast load lazily when the episode modal opens. See
  // WatchListRow for the same pattern.
  seasons?: Season[] | null;
  cast?: CastMember[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
}) {
  const {
    showId,
    showName,
    posterUrl,
    network,
    seasonNumber,
    episode,
    daysUntilAir,
    daysLabel,
    seasons = null,
    cast = [],
    watchedEpisodes,
    skipCatchUpPrompt,
    initialStatus,
    tmdbStatus,
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
      <TrackingUpcomingRowContent
        showId={showId}
        showName={showName}
        posterUrl={posterUrl}
        network={network}
        seasonNumber={seasonNumber}
        episode={episode}
        daysUntilAir={daysUntilAir}
        daysLabel={daysLabel}
      />
    </ShowTrackingProvider>
  );
}

function TrackingUpcomingRowContent({
  showId,
  showName,
  posterUrl,
  network,
  seasonNumber,
  episode,
  daysUntilAir,
  daysLabel,
}: {
  showId: number;
  showName: string;
  posterUrl: string | null;
  network: string | null;
  seasonNumber: number;
  episode: SeasonEpisode;
  daysUntilAir: number;
  daysLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const { cast, seasonsLoading, onLoadSeasons } = useShowTrackingContext();

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
        className="flex min-h-24 w-full cursor-pointer items-stretch overflow-hidden rounded-md bg-white/[0.045] text-left lg:min-h-26"
      >
        <div className="bg-surface relative w-23 flex-none overflow-hidden lg:w-30">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={showName}
              fill
              sizes="(min-width: 1024px) 120px, 92px"
              className="object-cover"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-3 py-3">
          <Link
            href={`/show/${showId}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex max-w-full items-center gap-1 self-start rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase"
          >
            <span className="truncate">{showName}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </Link>
          <div className="font-heading lg:text-md text-base font-extrabold text-white">
            S{String(seasonNumber).padStart(2, '0')} · E
            {String(episode.episodeNumber).padStart(2, '0')}
          </div>
          <div className="text-text-secondary truncate text-xs">
            {episode.name}
          </div>
        </div>

        <div className="flex flex-none flex-col items-center justify-center py-3 pr-4 pl-2 text-center">
          <div className="font-heading text-2xl leading-none font-extrabold text-white">
            {daysUntilAir}
          </div>
          <div className="text-text-secondary text-[9px] font-bold tracking-wide">
            {daysLabel}
          </div>
          {network ? (
            <div className="text-text-faint text-[9px] font-bold tracking-wide">
              {network.toUpperCase()}
            </div>
          ) : null}
        </div>
      </div>

      <EpisodeModal
        episode={episode}
        seasonNumber={seasonNumber}
        cast={cast}
        castLoading={seasonsLoading}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
