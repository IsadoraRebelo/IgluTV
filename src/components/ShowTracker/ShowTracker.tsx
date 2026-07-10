'use client';

import { useEffect, useRef, useState } from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { toast } from 'sonner';

import { AuthDialog, Button, SeasonAccordion, WatchNextCard } from '@/components';
import type {
  CastMember,
  EpisodeWatch,
  Season,
  ShowDetails,
  ShowMeta,
} from '@/types';

import {
  markEpisodeWatchedAction,
  markSeasonWatchedAction,
  resetEpisodeToSingleWatchAction,
  resetSeasonToSingleWatchAction,
  rewatchSeasonAction,
  setSkipCatchUpPromptAction,
  unmarkEpisodeWatchedAction,
  unmarkSeasonWatchedAction,
} from './actions';
import type { EpisodeRef } from './utils';
import {
  episodeKey,
  getDaysUntilAir,
  getEpisodeSectionState,
  getPriorUnwatchedAiredEpisodes,
  getWatchCount,
} from './utils';

function CatchUpDialog({
  onYes,
  onNo,
  onNever,
}: {
  onYes: () => void;
  onNo: () => void;
  onNever: () => void;
}) {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onNo();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content className="bg-primary-foreground border-muted text-center fixed top-1/2 left-1/2 z-50 flex w-xs max-w-[250px] -translate-x-1/2 -translate-y-1/2 flex-col gap-1 rounded-lg border shadow-lg">
          <DialogPrimitive.Title className="text-foreground text-md font-semibold pt-4">
            Mark previous episodes?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-muted-foreground text-xs px-4">
           Do you want to mark all previous episodes as watched?
          </DialogPrimitive.Description>
          <div className="flex flex-col pt-4">
            <div className="border-t border-white/10 py-1">
              <Button variant="primary" className='w-full font-bold text-secondary' size="sm" onClick={onYes}>
                Yes
              </Button>
            </div>
            <div className="border-t border-white/10 py-1">
              <Button variant="primary" className='w-full font-bold text-secondary' size="sm" onClick={onNo}>
                No
              </Button>
            </div>
            <div className="border-t border-white/10 py-1">
              <Button variant="primary" className='w-full font-bold text-secondary' size="sm" onClick={onNever}>
                Never for this show
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ShowTracker({
  seasons,
  cast,
  showId,
  watchedEpisodes,
  skipCatchUpPrompt,
  meta,
  details,
}: {
  seasons: Season[];
  cast: CastMember[];
  showId: number;
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  meta: ShowMeta | null;
  details: ShowDetails;
}) {
  const [watchedCounts, setWatchedCounts] = useState<Map<string, number>>(
    () => {
      const counts = new Map<string, number>();
      for (const w of watchedEpisodes) {
        const key = episodeKey(w.seasonNumber, w.episodeNumber);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return counts;
    }
  );
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [catchUpDisabled, setCatchUpDisabled] = useState(skipCatchUpPrompt);
  const [catchUpOffer, setCatchUpOffer] = useState<EpisodeRef[] | null>(null);

  const watchedCountsRef = useRef(watchedCounts);
  useEffect(() => {
    watchedCountsRef.current = watchedCounts;
  }, [watchedCounts]);

  const pendingKeysRef = useRef(pendingKeys);
  useEffect(() => {
    pendingKeysRef.current = pendingKeys;
  }, [pendingKeys]);

  const catchUpDisabledRef = useRef(catchUpDisabled);
  useEffect(() => {
    catchUpDisabledRef.current = catchUpDisabled;
  }, [catchUpDisabled]);

  async function handleMarkPriorEpisodes(priorEpisodes: EpisodeRef[]) {
    const toMark = priorEpisodes.filter(
      (ep) =>
        !pendingKeysRef.current.has(episodeKey(ep.seasonNumber, ep.episodeNumber))
    );
    if (toMark.length === 0) {
      toast.info('Those episodes are already being updated');
      return;
    }

    const bySeason = new Map<number, EpisodeRef[]>();
    for (const ep of toMark) {
      const group = bySeason.get(ep.seasonNumber) ?? [];
      group.push(ep);
      bySeason.set(ep.seasonNumber, group);
    }
    const allKeys = toMark.map((ep) =>
      episodeKey(ep.seasonNumber, ep.episodeNumber)
    );

    setPendingKeys((prev) => {
      const next = new Set(prev);
      allKeys.forEach((key) => next.add(key));
      return next;
    });
    setWatchedCounts((prev) => {
      const next = new Map(prev);
      allKeys.forEach((key) => next.set(key, 1));
      return next;
    });

    try {
      const groups = Array.from(bySeason.entries());
      const results = await Promise.all(
        groups.map(([seasonNumber, episodes]) =>
          markSeasonWatchedAction(
            showId,
            seasonNumber,
            episodes.map((ep) => ep.episodeNumber)
          )
        )
      );

      const failedGroups: {
        episodes: EpisodeRef[];
        code: string | null;
        message: string;
      }[] = [];
      let markedCount = 0;

      results.forEach((result, i) => {
        const [, episodes] = groups[i];
        if (result.ok) {
          markedCount += episodes.length;
        } else {
          failedGroups.push({
            episodes,
            code: result.code,
            message: result.message,
          });
        }
      });

      if (failedGroups.length === 0) {
        toast.success(
          `Marked ${markedCount} earlier episode${markedCount === 1 ? '' : 's'} as watched`
        );
        return;
      }

      setWatchedCounts((prev) => {
        const next = new Map(prev);
        for (const failed of failedGroups) {
          for (const ep of failed.episodes) {
            next.delete(episodeKey(ep.seasonNumber, ep.episodeNumber));
          }
        }
        return next;
      });

      if (markedCount > 0) {
        toast.success(
          `Marked ${markedCount} earlier episode${markedCount === 1 ? '' : 's'} as watched`
        );
      }

      const authFailure = failedGroups.find(
        (failed) => failed.code === 'not_authenticated'
      );
      if (authFailure) {
        setAuthDialogOpen(true);
      } else {
        toast.error(failedGroups[0].message);
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        allKeys.forEach((key) => next.delete(key));
        return next;
      });
    }
  }

  function offerToMarkPriorEpisodes(priorEpisodes: EpisodeRef[]) {
    if (priorEpisodes.length === 0 || catchUpDisabledRef.current) return;
    setCatchUpOffer(priorEpisodes);
  }

  async function handleNeverAskAgainForShow() {
    const previousDisabled = catchUpDisabled;
    setCatchUpDisabled(true);
    setCatchUpOffer(null);

    const result = await setSkipCatchUpPromptAction(showId, true);
    if (!result.ok) {
      setCatchUpDisabled(previousDisabled);

      if (result.code === 'not_authenticated') {
        setAuthDialogOpen(true);
      } else {
        toast.error(result.message);
      }
    }
  }

  async function handleToggleEpisode(
    seasonNumber: number,
    episodeNumber: number
  ) {
    const key = episodeKey(seasonNumber, episodeNumber);
    if (pendingKeys.has(key)) return;

    const previousCount = getWatchCount(watchedCounts, key);
    const wasWatched = previousCount > 0;

    setPendingKeys((prev) => new Set(prev).add(key));
    setWatchedCounts((prev) => {
      const next = new Map(prev);
      if (wasWatched) next.delete(key);
      else next.set(key, 1);
      return next;
    });

    try {
      const result = wasWatched
        ? await unmarkEpisodeWatchedAction(showId, seasonNumber, episodeNumber)
        : await markEpisodeWatchedAction(showId, seasonNumber, episodeNumber);

      if (!result.ok) {
        setWatchedCounts((prev) => {
          const next = new Map(prev);
          if (wasWatched) next.set(key, previousCount);
          else next.delete(key);
          return next;
        });

        if (result.code === 'not_authenticated') {
          setAuthDialogOpen(true);
        } else {
          toast.error(result.message);
        }
      } else if (!wasWatched) {
        offerToMarkPriorEpisodes(
          getPriorUnwatchedAiredEpisodes(
            seasons,
            watchedCountsRef.current,
            seasonNumber,
            episodeNumber
          )
        );
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleRewatchEpisode(
    seasonNumber: number,
    episodeNumber: number
  ) {
    const key = episodeKey(seasonNumber, episodeNumber);
    if (pendingKeys.has(key)) return;

    const previousCount = getWatchCount(watchedCounts, key);

    setPendingKeys((prev) => new Set(prev).add(key));
    setWatchedCounts((prev) => {
      const next = new Map(prev);
      next.set(key, (prev.get(key) ?? 0) + 1);
      return next;
    });

    try {
      const result = await markEpisodeWatchedAction(
        showId,
        seasonNumber,
        episodeNumber
      );

      if (!result.ok) {
        setWatchedCounts((prev) => {
          const next = new Map(prev);
          if (previousCount > 0) next.set(key, previousCount);
          else next.delete(key);
          return next;
        });

        if (result.code === 'not_authenticated') {
          setAuthDialogOpen(true);
        } else {
          toast.error(result.message);
        }
        return;
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleResetEpisodeRewatches(
    seasonNumber: number,
    episodeNumber: number
  ) {
    const key = episodeKey(seasonNumber, episodeNumber);
    if (pendingKeys.has(key)) return;

    const previousCount = getWatchCount(watchedCounts, key);
    if (previousCount <= 1) return;

    setPendingKeys((prev) => new Set(prev).add(key));
    setWatchedCounts((prev) => {
      const next = new Map(prev);
      next.set(key, 1);
      return next;
    });

    try {
      const result = await resetEpisodeToSingleWatchAction(
        showId,
        seasonNumber,
        episodeNumber
      );

      if (!result.ok) {
        setWatchedCounts((prev) => {
          const next = new Map(prev);
          next.set(key, previousCount);
          return next;
        });

        if (result.code === 'not_authenticated') {
          setAuthDialogOpen(true);
        } else {
          toast.error(result.message);
        }
        return;
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleToggleSeason(season: Season) {
    const seasonKey = `season-${season.seasonNumber}`;
    if (pendingKeys.has(seasonKey)) return;

    const markableEpisodes = season.episodes.filter(
      (ep) => getDaysUntilAir(ep.airDate) === null
    );
    if (markableEpisodes.length === 0) return;

    const watchedCount = markableEpisodes.filter(
      (ep) =>
        getWatchCount(
          watchedCounts,
          episodeKey(season.seasonNumber, ep.episodeNumber)
        ) > 0
    ).length;
    const isFullyWatched = watchedCount === markableEpisodes.length;

    const episodesToToggle = isFullyWatched
      ? markableEpisodes
      : markableEpisodes.filter(
          (ep) =>
            getWatchCount(
              watchedCounts,
              episodeKey(season.seasonNumber, ep.episodeNumber)
            ) === 0
        );

    const episodeKeysToLock = episodesToToggle.map((ep) =>
      episodeKey(season.seasonNumber, ep.episodeNumber)
    );
    if (episodeKeysToLock.some((key) => pendingKeys.has(key))) return;

    const previousCounts = new Map(
      episodesToToggle.map((ep) => {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        return [key, getWatchCount(watchedCounts, key)] as const;
      })
    );

    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.add(seasonKey);
      episodeKeysToLock.forEach((key) => next.add(key));
      return next;
    });
    setWatchedCounts((prev) => {
      const next = new Map(prev);
      for (const ep of episodesToToggle) {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        if (isFullyWatched) next.delete(key);
        else next.set(key, 1);
      }
      return next;
    });

    try {
      const result = isFullyWatched
        ? await unmarkSeasonWatchedAction(showId, season.seasonNumber)
        : await markSeasonWatchedAction(
            showId,
            season.seasonNumber,
            markableEpisodes.map((ep) => ep.episodeNumber)
          );

      if (!result.ok) {
        setWatchedCounts((prev) => {
          const next = new Map(prev);
          for (const [key, count] of previousCounts) {
            if (count > 0) next.set(key, count);
            else next.delete(key);
          }
          return next;
        });

        if (result.code === 'not_authenticated') {
          setAuthDialogOpen(true);
        } else {
          toast.error(result.message);
        }
      } else if (!isFullyWatched) {
        offerToMarkPriorEpisodes(
          getPriorUnwatchedAiredEpisodes(
            seasons,
            watchedCountsRef.current,
            season.seasonNumber,
            null
          )
        );
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(seasonKey);
        episodeKeysToLock.forEach((key) => next.delete(key));
        return next;
      });
    }
  }

  async function handleRewatchSeason(season: Season) {
    const seasonKey = `season-${season.seasonNumber}`;
    if (pendingKeys.has(seasonKey)) return;

    const markableEpisodes = season.episodes.filter(
      (ep) => getDaysUntilAir(ep.airDate) === null
    );
    if (markableEpisodes.length === 0) return;

    const episodeKeysToLock = markableEpisodes.map((ep) =>
      episodeKey(season.seasonNumber, ep.episodeNumber)
    );
    if (episodeKeysToLock.some((key) => pendingKeys.has(key))) return;

    const previousCounts = new Map(
      markableEpisodes.map((ep) => {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        return [key, getWatchCount(watchedCounts, key)] as const;
      })
    );

    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.add(seasonKey);
      episodeKeysToLock.forEach((key) => next.add(key));
      return next;
    });
    setWatchedCounts((prev) => {
      const next = new Map(prev);
      for (const ep of markableEpisodes) {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        next.set(key, (prev.get(key) ?? 0) + 1);
      }
      return next;
    });

    try {
      const result = await rewatchSeasonAction(
        showId,
        season.seasonNumber,
        markableEpisodes.map((ep) => ep.episodeNumber)
      );

      if (!result.ok) {
        setWatchedCounts((prev) => {
          const next = new Map(prev);
          for (const [key, count] of previousCounts) {
            if (count > 0) next.set(key, count);
            else next.delete(key);
          }
          return next;
        });

        if (result.code === 'not_authenticated') {
          setAuthDialogOpen(true);
        } else {
          toast.error(result.message);
        }
        return;
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(seasonKey);
        episodeKeysToLock.forEach((key) => next.delete(key));
        return next;
      });
    }
  }

  async function handleResetSeasonRewatches(season: Season) {
    const seasonKey = `season-${season.seasonNumber}`;
    if (pendingKeys.has(seasonKey)) return;

    const markableEpisodes = season.episodes.filter(
      (ep) => getDaysUntilAir(ep.airDate) === null
    );
    if (markableEpisodes.length === 0) return;

    const episodeKeysToLock = markableEpisodes.map((ep) =>
      episodeKey(season.seasonNumber, ep.episodeNumber)
    );
    if (episodeKeysToLock.some((key) => pendingKeys.has(key))) return;

    const previousCounts = new Map(
      markableEpisodes.map((ep) => {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        return [key, getWatchCount(watchedCounts, key)] as const;
      })
    );

    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.add(seasonKey);
      episodeKeysToLock.forEach((key) => next.add(key));
      return next;
    });
    setWatchedCounts((prev) => {
      const next = new Map(prev);
      for (const ep of markableEpisodes) {
        next.set(episodeKey(season.seasonNumber, ep.episodeNumber), 1);
      }
      return next;
    });

    try {
      const result = await resetSeasonToSingleWatchAction(
        showId,
        season.seasonNumber,
        markableEpisodes.map((ep) => ep.episodeNumber)
      );

      if (!result.ok) {
        setWatchedCounts((prev) => {
          const next = new Map(prev);
          for (const [key, count] of previousCounts) {
            if (count > 0) next.set(key, count);
            else next.delete(key);
          }
          return next;
        });

        if (result.code === 'not_authenticated') {
          setAuthDialogOpen(true);
        } else {
          toast.error(result.message);
        }
        return;
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(seasonKey);
        episodeKeysToLock.forEach((key) => next.delete(key));
        return next;
      });
    }
  }

  const episodeSection = getEpisodeSectionState(meta, details, watchedCounts);
  const isCurrentEpisodePending =
    episodeSection.kind === 'latest' || episodeSection.kind === 'next'
      ? pendingKeys.has(
          episodeKey(
            episodeSection.episode.seasonNumber,
            episodeSection.episode.episodeNumber
          )
        )
      : false;

  return (
    <>
      {episodeSection.kind !== 'hidden' ? (
        <WatchNextCard
          episodeSection={episodeSection}
          cast={cast}
          isPending={isCurrentEpisodePending}
          onToggleEpisode={handleToggleEpisode}
        />
      ) : null}

      {seasons.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">
            Seasons ({meta?.numberOfSeasons ?? seasons.length})
          </h2>
          <SeasonAccordion
            seasons={seasons}
            cast={cast}
            watchedCounts={watchedCounts}
            pendingKeys={pendingKeys}
            onToggleEpisode={handleToggleEpisode}
            onRewatchEpisode={handleRewatchEpisode}
            onResetEpisodeRewatches={handleResetEpisodeRewatches}
            onToggleSeason={handleToggleSeason}
            onRewatchSeason={handleRewatchSeason}
            onResetSeasonRewatches={handleResetSeasonRewatches}
          />
        </section>
      ) : null}

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />

      {catchUpOffer !== null ? (
        <CatchUpDialog
          onYes={() => {
            handleMarkPriorEpisodes(catchUpOffer);
            setCatchUpOffer(null);
          }}
          onNo={() => setCatchUpOffer(null)}
          onNever={handleNeverAskAgainForShow}
        />
      ) : null}
    </>
  );
}
