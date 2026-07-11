'use client';

import { useState } from 'react';

import { LatestEpisodeCard } from '@/components';
import type { EpisodeSectionState } from '@/components/ShowTracker/utils';


import type { CastMember } from '@/types';

export function WatchNextCard({
  episodeSection,
  cast,
  isPending,
  onToggleEpisode,
  isLoggedIn,
}: {
  episodeSection: EpisodeSectionState;
  cast: CastMember[];
  isPending: boolean;
  onToggleEpisode: (seasonNumber: number, episodeNumber: number) => void;
  isLoggedIn: boolean;
}) {
  const [phase, setPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');

  const [frozenSection, setFrozenSection] =
    useState<EpisodeSectionState | null>(null);

  const displayedSection =
    phase === 'idle' ? episodeSection : (frozenSection ?? episodeSection);

  if (displayedSection.kind === 'hidden') return null;

  function handleCheck() {
    if (
      displayedSection.kind !== 'latest' &&
      displayedSection.kind !== 'next'
    ) {
      return;
    }
    onToggleEpisode(
      displayedSection.episode.seasonNumber,
      displayedSection.episode.episodeNumber
    );
    setFrozenSection(displayedSection);
    setPhase('exiting');
  }

  function handleAnimationEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;

    if (phase === 'exiting') {
      setFrozenSection(null);

      setPhase(episodeSection.kind === 'hidden' ? 'idle' : 'entering');
    } else if (phase === 'entering') {
      setPhase('idle');
    }
  }

  const animationClassName =
    phase === 'exiting'
      ? 'animate-slide-out-left'
      : phase === 'entering'
        ? 'animate-slide-in-right'
        : '';

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-white">
        {displayedSection.title}
      </h2>
      <div className={animationClassName} onAnimationEnd={handleAnimationEnd}>
        {displayedSection.kind === 'latest' ||
        displayedSection.kind === 'next' ? (
          <LatestEpisodeCard
            episode={displayedSection.episode}
            cast={cast}
            isWatched={false}
            isPending={isPending}
            onToggleWatched={handleCheck}
            isLoggedIn={isLoggedIn}
          />
        ) : (
          <p className="text-sm text-[#8a9bab]">
            You&apos;re all caught up — no new episodes yet.
          </p>
        )}
      </div>
    </section>
  );
}
