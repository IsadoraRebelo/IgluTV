'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { toast } from 'sonner';

import { AuthDialog, Button } from '@/components';
import type { EpisodeWatch, Season, SeasonEpisode, ShowStatus } from '@/types';

import {
  markEpisodeWatchedAction,
  markSeasonWatchedAction,
  removeLastEpisodeRewatchAction,
  removeLastSeasonRewatchAction,
  removeShowTrackingAction,
  rewatchSeasonAction,
  setShowStatusAction,
  setSkipCatchUpPromptAction,
  unmarkEpisodeWatchedAction,
  unmarkSeasonWatchedAction,
} from './actions';
import type { EpisodeRef } from './utils';
import {
  episodeKey,
  getDaysUntilAir,
  getPriorUnwatchedAiredEpisodes,
  getWatchCount,
  getWatchedDates,
  isShowFinished,
} from './utils';

const MARK_SHOW_WATCHED_KEY = 'mark-show-watched';
const SHOW_STATUS_KEY = 'show-status';

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type ShowTrackingContextValue = {
  watchedDates: Map<string, string[]>;
  pendingKeys: Set<string>;
  onToggleEpisode: (seasonNumber: number, episodeNumber: number) => void;
  onRewatchEpisode: (seasonNumber: number, episodeNumber: number) => void;
  onRemoveLastEpisodeRewatch: (
    seasonNumber: number,
    episodeNumber: number
  ) => void;
  onToggleSeason: (season: Season) => void;
  onRewatchSeason: (season: Season) => void;
  onRemoveLastSeasonRewatch: (season: Season) => void;
  onMarkShowWatched: () => void;
  isMarkingShowWatched: boolean;
  isShowFullyWatched: boolean;
  isShowCompleted: boolean;
  isShowCaughtUp: boolean;
  showStatus: ShowStatus | null;
  onSetShowStatus: (status: ShowStatus) => void;
  isSettingShowStatus: boolean;
};

const ShowTrackingContext = createContext<ShowTrackingContextValue | null>(
  null
);

export function useShowTrackingContext(): ShowTrackingContextValue {
  const value = useContext(ShowTrackingContext);
  if (!value) {
    throw new Error(
      'useShowTrackingContext must be used within a ShowTrackingProvider'
    );
  }
  return value;
}

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

// Offered when clicking "Mark watched" while the show is already fully
// watched — lets the user unmark the whole show instead of the click
// silently doing nothing.
function UnmarkShowDialog({
  onYes,
  onNo,
}: {
  onYes: () => void;
  onNo: () => void;
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
            Mark show as unwatched?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-muted-foreground text-xs px-4">
            This will remove every watched episode for this show.
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
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ShowTrackingProvider({
  showId,
  seasons,
  watchedEpisodes,
  skipCatchUpPrompt,
  initialStatus,
  tmdbStatus,
  children,
}: {
  showId: number;
  seasons: Season[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  tmdbStatus: string | null;
  children: ReactNode;
}) {
  const [watchedDates, setWatchedDates] = useState<Map<string, string[]>>(
    () => {
      const dates = new Map<string, string[]>();
      for (const w of watchedEpisodes) {
        const key = episodeKey(w.seasonNumber, w.episodeNumber);
        const existing = dates.get(key);
        if (existing) existing.push(w.watchedOn);
        else dates.set(key, [w.watchedOn]);
      }
      return dates;
    }
  );
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [catchUpDisabled, setCatchUpDisabled] = useState(skipCatchUpPrompt);
  const [catchUpOffer, setCatchUpOffer] = useState<EpisodeRef[] | null>(null);
  const [unmarkShowConfirmOpen, setUnmarkShowConfirmOpen] = useState(false);
  const [showStatus, setShowStatusState] = useState<ShowStatus | null>(
    initialStatus
  );

  // Regular seasons (season 0 excluded) that have at least one markable
  // (aired) episode — the target set for both the bulk mark and bulk
  // unmark actions, and for deciding whether the whole show counts as
  // "fully watched".
  const regularMarkableSeasons = seasons
    .filter((season) => season.seasonNumber > 0)
    .map((season) => ({
      season,
      markableEpisodes: season.episodes.filter(
        (ep) => getDaysUntilAir(ep.airDate) === null
      ),
    }))
    .filter(({ markableEpisodes }) => markableEpisodes.length > 0);

  const isShowFullyWatched =
    regularMarkableSeasons.length > 0 &&
    regularMarkableSeasons.every(({ season, markableEpisodes }) =>
      markableEpisodes.every(
        (ep) =>
          getWatchCount(
            watchedDates,
            episodeKey(season.seasonNumber, ep.episodeNumber)
          ) > 0
      )
    );

  const isShowCompleted = isShowFullyWatched && isShowFinished(tmdbStatus);
  const isShowCaughtUp = isShowFullyWatched && !isShowFinished(tmdbStatus);

  const hasStartedWatching = watchedDates.size > 0;
  const displayedShowStatus: ShowStatus | null = isShowCompleted
    ? 'completed'
    : (showStatus === null || showStatus === 'watch_later') &&
        hasStartedWatching
      ? 'watching'
      : showStatus;

  const watchedDatesRef = useRef(watchedDates);
  useEffect(() => {
    watchedDatesRef.current = watchedDates;
  }, [watchedDates]);

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
    setWatchedDates((prev) => {
      const next = new Map(prev);
      allKeys.forEach((key) => next.set(key, [todayIso()]));
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

      setWatchedDates((prev) => {
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

    const previousDates = getWatchedDates(watchedDates, key);
    const wasWatched = previousDates.length > 0;

    setPendingKeys((prev) => new Set(prev).add(key));
    setWatchedDates((prev) => {
      const next = new Map(prev);
      if (wasWatched) next.delete(key);
      else next.set(key, [todayIso()]);
      return next;
    });

    try {
      const result = wasWatched
        ? await unmarkEpisodeWatchedAction(showId, seasonNumber, episodeNumber)
        : await markEpisodeWatchedAction(showId, seasonNumber, episodeNumber);

      if (!result.ok) {
        setWatchedDates((prev) => {
          const next = new Map(prev);
          if (wasWatched) next.set(key, previousDates);
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
            watchedDatesRef.current,
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

    const previousDates = getWatchedDates(watchedDates, key);

    setPendingKeys((prev) => new Set(prev).add(key));
    setWatchedDates((prev) => {
      const next = new Map(prev);
      next.set(key, [...(prev.get(key) ?? []), todayIso()]);
      return next;
    });

    try {
      const result = await markEpisodeWatchedAction(
        showId,
        seasonNumber,
        episodeNumber
      );

      if (!result.ok) {
        setWatchedDates((prev) => {
          const next = new Map(prev);
          if (previousDates.length > 0) next.set(key, previousDates);
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

  async function handleRemoveLastEpisodeRewatch(
    seasonNumber: number,
    episodeNumber: number
  ) {
    const key = episodeKey(seasonNumber, episodeNumber);
    if (pendingKeys.has(key)) return;

    const previousDates = getWatchedDates(watchedDates, key);
    if (previousDates.length <= 1) return;

    setPendingKeys((prev) => new Set(prev).add(key));
    setWatchedDates((prev) => {
      const next = new Map(prev);
      const dates = prev.get(key) ?? [];
      next.set(key, dates.slice(0, -1));
      return next;
    });

    try {
      const result = await removeLastEpisodeRewatchAction(
        showId,
        seasonNumber,
        episodeNumber
      );

      if (!result.ok) {
        setWatchedDates((prev) => {
          const next = new Map(prev);
          next.set(key, previousDates);
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
          watchedDates,
          episodeKey(season.seasonNumber, ep.episodeNumber)
        ) > 0
    ).length;
    const isFullyWatched = watchedCount === markableEpisodes.length;

    const episodesToToggle = isFullyWatched
      ? markableEpisodes
      : markableEpisodes.filter(
          (ep) =>
            getWatchCount(
              watchedDates,
              episodeKey(season.seasonNumber, ep.episodeNumber)
            ) === 0
        );

    const episodeKeysToLock = episodesToToggle.map((ep) =>
      episodeKey(season.seasonNumber, ep.episodeNumber)
    );
    if (episodeKeysToLock.some((key) => pendingKeys.has(key))) return;

    const previousDatesByKey = new Map(
      episodesToToggle.map((ep) => {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        return [key, getWatchedDates(watchedDates, key)] as const;
      })
    );

    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.add(seasonKey);
      episodeKeysToLock.forEach((key) => next.add(key));
      return next;
    });
    setWatchedDates((prev) => {
      const next = new Map(prev);
      for (const ep of episodesToToggle) {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        if (isFullyWatched) next.delete(key);
        else next.set(key, [todayIso()]);
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
        setWatchedDates((prev) => {
          const next = new Map(prev);
          for (const [key, dates] of previousDatesByKey) {
            if (dates.length > 0) next.set(key, dates);
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
            watchedDatesRef.current,
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

    const previousDatesByKey = new Map(
      markableEpisodes.map((ep) => {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        return [key, getWatchedDates(watchedDates, key)] as const;
      })
    );

    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.add(seasonKey);
      episodeKeysToLock.forEach((key) => next.add(key));
      return next;
    });
    setWatchedDates((prev) => {
      const next = new Map(prev);
      for (const ep of markableEpisodes) {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        next.set(key, [...(prev.get(key) ?? []), todayIso()]);
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
        setWatchedDates((prev) => {
          const next = new Map(prev);
          for (const [key, dates] of previousDatesByKey) {
            if (dates.length > 0) next.set(key, dates);
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

  async function handleRemoveLastSeasonRewatch(season: Season) {
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

    const previousDatesByKey = new Map(
      markableEpisodes.map((ep) => {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        return [key, getWatchedDates(watchedDates, key)] as const;
      })
    );

    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.add(seasonKey);
      episodeKeysToLock.forEach((key) => next.add(key));
      return next;
    });
    setWatchedDates((prev) => {
      const next = new Map(prev);
      for (const ep of markableEpisodes) {
        const key = episodeKey(season.seasonNumber, ep.episodeNumber);
        const dates = prev.get(key) ?? [];
        next.set(key, dates.slice(0, -1));
      }
      return next;
    });

    try {
      const result = await removeLastSeasonRewatchAction(
        showId,
        season.seasonNumber,
        markableEpisodes.map((ep) => ep.episodeNumber)
      );

      if (!result.ok) {
        setWatchedDates((prev) => {
          const next = new Map(prev);
          for (const [key, dates] of previousDatesByKey) {
            if (dates.length > 0) next.set(key, dates);
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

  async function handleMarkShowWatched() {
    if (pendingKeys.has(MARK_SHOW_WATCHED_KEY) || isShowFullyWatched) return;

    const episodeKeysToLock: string[] = [];
    for (const { season, markableEpisodes } of regularMarkableSeasons) {
      for (const ep of markableEpisodes) {
        episodeKeysToLock.push(
          episodeKey(season.seasonNumber, ep.episodeNumber)
        );
      }
    }
    if (episodeKeysToLock.length === 0) return;
    if (episodeKeysToLock.some((key) => pendingKeys.has(key))) return;

    const previousDatesByKey = new Map(
      episodeKeysToLock.map(
        (key) => [key, getWatchedDates(watchedDates, key)] as const
      )
    );

    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.add(MARK_SHOW_WATCHED_KEY);
      episodeKeysToLock.forEach((key) => next.add(key));
      return next;
    });
    setWatchedDates((prev) => {
      const next = new Map(prev);
      episodeKeysToLock.forEach((key) => {
        if (!next.has(key)) next.set(key, [todayIso()]);
      });
      return next;
    });

    try {
      const results = await Promise.all(
        regularMarkableSeasons.map(({ season, markableEpisodes }) =>
          markSeasonWatchedAction(
            showId,
            season.seasonNumber,
            markableEpisodes.map((ep) => ep.episodeNumber)
          )
        )
      );

      const failedSeasons: {
        season: Season;
        markableEpisodes: SeasonEpisode[];
        code: string | null;
        message: string;
      }[] = [];

      results.forEach((result, i) => {
        if (!result.ok) {
          const { season, markableEpisodes } = regularMarkableSeasons[i];
          failedSeasons.push({
            season,
            markableEpisodes,
            code: result.code,
            message: result.message,
          });
        }
      });

      if (failedSeasons.length === 0) return;

      setWatchedDates((prev) => {
        const next = new Map(prev);
        for (const failed of failedSeasons) {
          for (const ep of failed.markableEpisodes) {
            const key = episodeKey(
              failed.season.seasonNumber,
              ep.episodeNumber
            );
            const previousEpDates = previousDatesByKey.get(key) ?? [];
            if (previousEpDates.length > 0) next.set(key, previousEpDates);
            else next.delete(key);
          }
        }
        return next;
      });

      const authFailure = failedSeasons.find(
        (failed) => failed.code === 'not_authenticated'
      );
      if (authFailure) {
        setAuthDialogOpen(true);
      } else {
        toast.error(failedSeasons[0].message);
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(MARK_SHOW_WATCHED_KEY);
        episodeKeysToLock.forEach((key) => next.delete(key));
        return next;
      });
    }
  }

  async function handleUnmarkShowWatched() {
    if (pendingKeys.has(MARK_SHOW_WATCHED_KEY)) return;

    const episodeKeysToLock: string[] = [];
    for (const { season, markableEpisodes } of regularMarkableSeasons) {
      for (const ep of markableEpisodes) {
        episodeKeysToLock.push(
          episodeKey(season.seasonNumber, ep.episodeNumber)
        );
      }
    }
    if (episodeKeysToLock.length === 0) return;
    if (episodeKeysToLock.some((key) => pendingKeys.has(key))) return;

    const previousDatesByKey = new Map(
      episodeKeysToLock.map(
        (key) => [key, getWatchedDates(watchedDates, key)] as const
      )
    );

    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.add(MARK_SHOW_WATCHED_KEY);
      episodeKeysToLock.forEach((key) => next.add(key));
      return next;
    });
    setWatchedDates((prev) => {
      const next = new Map(prev);
      episodeKeysToLock.forEach((key) => next.delete(key));
      return next;
    });

    try {
      const results = await Promise.all(
        regularMarkableSeasons.map(({ season }) =>
          unmarkSeasonWatchedAction(showId, season.seasonNumber)
        )
      );

      const failedSeasons: {
        season: Season;
        markableEpisodes: SeasonEpisode[];
        code: string | null;
        message: string;
      }[] = [];

      results.forEach((result, i) => {
        if (!result.ok) {
          const { season, markableEpisodes } = regularMarkableSeasons[i];
          failedSeasons.push({
            season,
            markableEpisodes,
            code: result.code,
            message: result.message,
          });
        }
      });

      if (failedSeasons.length === 0) return;

      setWatchedDates((prev) => {
        const next = new Map(prev);
        for (const failed of failedSeasons) {
          for (const ep of failed.markableEpisodes) {
            const key = episodeKey(
              failed.season.seasonNumber,
              ep.episodeNumber
            );
            const previousEpDates = previousDatesByKey.get(key) ?? [];
            if (previousEpDates.length > 0) next.set(key, previousEpDates);
          }
        }
        return next;
      });

      const authFailure = failedSeasons.find(
        (failed) => failed.code === 'not_authenticated'
      );
      if (authFailure) {
        setAuthDialogOpen(true);
      } else {
        toast.error(failedSeasons[0].message);
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(MARK_SHOW_WATCHED_KEY);
        episodeKeysToLock.forEach((key) => next.delete(key));
        return next;
      });
    }
  }

  async function handleReviveToWatching() {
    if (pendingKeys.has(SHOW_STATUS_KEY)) return;

    const previousStatus = showStatus;
    setPendingKeys((prev) => new Set(prev).add(SHOW_STATUS_KEY));
    setShowStatusState('watching');

    try {
      const result = await setShowStatusAction(showId, 'watching');

      if (!result.ok) {
        setShowStatusState(previousStatus);

        if (result.code === 'not_authenticated') {
          setAuthDialogOpen(true);
        } else {
          toast.error(result.message);
        }
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(SHOW_STATUS_KEY);
        return next;
      });
    }
  }

  function handleMarkShowWatchedButtonClick() {
    if (displayedShowStatus === 'paused' || displayedShowStatus === 'dropped') {
      handleReviveToWatching();
      return;
    }
    if (isShowFullyWatched) {
      setUnmarkShowConfirmOpen(true);
    } else {
      handleMarkShowWatched();
    }
  }

  async function handleRemoveShowTracking() {
    if (pendingKeys.has(SHOW_STATUS_KEY)) return;

    const previousStatus = showStatus;
    setPendingKeys((prev) => new Set(prev).add(SHOW_STATUS_KEY));
    setShowStatusState(null);

    try {
      const result = await removeShowTrackingAction(showId);

      if (!result.ok) {
        setShowStatusState(previousStatus);

        if (result.code === 'not_authenticated') {
          setAuthDialogOpen(true);
        } else {
          toast.error(result.message);
        }
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(SHOW_STATUS_KEY);
        return next;
      });
    }
  }

  async function handleSetShowStatus(status: ShowStatus) {
    if (pendingKeys.has(SHOW_STATUS_KEY)) return;

    if (showStatus === status) {
      if (status === 'watch_later') await handleRemoveShowTracking();
      return;
    }

    const previousStatus = showStatus;

    setPendingKeys((prev) => new Set(prev).add(SHOW_STATUS_KEY));
    setShowStatusState(status);

    try {
      const result = await setShowStatusAction(showId, status);

      if (!result.ok) {
        setShowStatusState(previousStatus);

        if (result.code === 'not_authenticated') {
          setAuthDialogOpen(true);
        } else {
          toast.error(result.message);
        }
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(SHOW_STATUS_KEY);
        return next;
      });
    }
  }

  const value: ShowTrackingContextValue = {
    watchedDates,
    pendingKeys,
    onToggleEpisode: handleToggleEpisode,
    onRewatchEpisode: handleRewatchEpisode,
    onRemoveLastEpisodeRewatch: handleRemoveLastEpisodeRewatch,
    onToggleSeason: handleToggleSeason,
    onRewatchSeason: handleRewatchSeason,
    onRemoveLastSeasonRewatch: handleRemoveLastSeasonRewatch,
    onMarkShowWatched: handleMarkShowWatchedButtonClick,
    isMarkingShowWatched: pendingKeys.has(MARK_SHOW_WATCHED_KEY),
    isShowFullyWatched,
    isShowCompleted,
    isShowCaughtUp,
    showStatus: displayedShowStatus,
    onSetShowStatus: handleSetShowStatus,
    isSettingShowStatus: pendingKeys.has(SHOW_STATUS_KEY),
  };

  return (
    <ShowTrackingContext.Provider value={value}>
      {children}
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
      {unmarkShowConfirmOpen ? (
        <UnmarkShowDialog
          onYes={() => {
            handleUnmarkShowWatched();
            setUnmarkShowConfirmOpen(false);
          }}
          onNo={() => setUnmarkShowConfirmOpen(false)}
        />
      ) : null}
    </ShowTrackingContext.Provider>
  );
}
