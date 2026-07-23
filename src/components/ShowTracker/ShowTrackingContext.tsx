'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { AuthDialog } from '@/components';

import type {
  CastMember,
  EpisodeWatch,
  LatestEpisode,
  Season,
  SeasonEpisode,
  ShowImageKind,
  ShowStatus,
} from '@/types';

import {
  loadShowSeasonsAction,
  markEpisodeWatchedAction,
  markSeasonWatchedAction,
  removeLastEpisodeRewatchAction,
  removeLastSeasonRewatchAction,
  removeShowTrackingAction,
  rewatchSeasonAction,
  setShowStatusAction,
  setSkipCatchUpPromptAction,
  toggleFavouriteAction,
  unmarkEpisodeWatchedAction,
  unmarkSeasonWatchedAction,
  updateEpisodeWatchDateAction,
} from './actions';
import { ShowTrackingContext, type ShowTrackingContextValue } from './context';
import { CatchUpDialog, DateChoiceDialog, UnmarkShowDialog } from './dialogs';
import {
  getDisplayedShowStatus,
  getIsShowCaughtUp,
  getIsShowCompleted,
  getIsShowFullyWatched,
  getRegularMarkableSeasons,
} from './selectors';
import {
  buildWatchedDatesMap,
  episodeKey,
  getDaysUntilAir,
  getPriorUnwatchedAiredEpisodes,
  getWatchCount,
  getWatchedDates,
} from './utils';
import type { EpisodeRef } from './utils';

export { useShowTrackingContext } from './context';

const MARK_SHOW_WATCHED_KEY = 'mark-show-watched';
const SHOW_STATUS_KEY = 'show-status';
const FAVOURITE_KEY = 'favourite';

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ShowTrackingProvider({
  showId,
  seasons: initialSeasons,
  cast: initialCast = [],
  watchedEpisodes,
  skipCatchUpPrompt,
  initialStatus,
  initialIsFavourite,
  initialCustomPosterUrl,
  initialCustomBannerUrl,
  tmdbStatus: initialTmdbStatus,
  isLoggedIn,
  children,
}: {
  showId: number;
  // null means "not loaded yet" — the tracking page seeds rows with only
  // their next episode, so the full season tree (and cast) is fetched on
  // demand when the episode modal opens, via onLoadSeasons.
  seasons: Season[] | null;
  cast?: CastMember[];
  watchedEpisodes: EpisodeWatch[];
  skipCatchUpPrompt: boolean;
  initialStatus: ShowStatus | null;
  initialIsFavourite: boolean;
  initialCustomPosterUrl: string | null;
  initialCustomBannerUrl: string | null;
  tmdbStatus: string | null;
  isLoggedIn: boolean;
  children: ReactNode;
}) {
  const [watchedDates, setWatchedDates] = useState<
    Map<string, (string | null)[]>
  >(() => buildWatchedDatesMap(watchedEpisodes));
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [catchUpDisabled, setCatchUpDisabled] = useState(skipCatchUpPrompt);
  const [catchUpOffer, setCatchUpOffer] = useState<EpisodeRef[] | null>(null);
  const [unmarkShowConfirmOpen, setUnmarkShowConfirmOpen] = useState(false);
  const [pendingDateChoice, setPendingDateChoice] = useState<
    { kind: 'show' } | { kind: 'season'; season: Season } | null
  >(null);
  const [showStatus, setShowStatusState] = useState<ShowStatus | null>(
    initialStatus
  );
  const [isFavourite, setIsFavourite] = useState(initialIsFavourite);
  const [customPosterUrl, setCustomPosterUrl] = useState(
    initialCustomPosterUrl
  );
  const [customBannerUrl, setCustomBannerUrl] = useState(
    initialCustomBannerUrl
  );
  const [seasons, setSeasons] = useState<Season[] | null>(initialSeasons);
  const [cast, setCast] = useState<CastMember[]>(initialCast);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [tmdbStatus, setTmdbStatusState] = useState(initialTmdbStatus);

  async function handleLoadSeasons(): Promise<Season[] | null> {
    if (seasons !== null || seasonsLoading) return seasons;
    setSeasonsLoading(true);
    try {
      const result = await loadShowSeasonsAction(showId);
      if (result) {
        setSeasons(result.seasons);
        setCast(result.cast);
        setTmdbStatusState(result.tmdbStatus);
        return result.seasons;
      }
      return null;
    } finally {
      setSeasonsLoading(false);
    }
  }

  const regularMarkableSeasons = getRegularMarkableSeasons(seasons ?? []);
  const isShowFullyWatched = getIsShowFullyWatched(
    regularMarkableSeasons,
    watchedDates
  );
  const isShowCompleted = getIsShowCompleted(isShowFullyWatched, tmdbStatus);
  const isShowCaughtUp = getIsShowCaughtUp(isShowFullyWatched, tmdbStatus);
  const hasStartedWatching = watchedDates.size > 0;
  const displayedShowStatus = getDisplayedShowStatus(
    isShowCompleted,
    showStatus,
    hasStartedWatching
  );

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

  async function handleMarkPriorEpisodes(
    priorEpisodes: EpisodeRef[],
    watchedOn: string | null
  ) {
    const toMark = priorEpisodes.filter(
      (ep) =>
        !pendingKeysRef.current.has(
          episodeKey(ep.seasonNumber, ep.episodeNumber)
        )
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
      allKeys.forEach((key) => next.set(key, [watchedOn]));
      return next;
    });

    try {
      const groups = Array.from(bySeason.entries());
      const results = await Promise.all(
        groups.map(([seasonNumber, episodes]) =>
          markSeasonWatchedAction(
            showId,
            seasonNumber,
            episodes.map((ep) => ep.episodeNumber),
            watchedOn
          )
        )
      );

      const failedGroups: {
        episodes: EpisodeRef[];
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

      toast.error(failedGroups[0].message);
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
      toast.error(result.message);
    }
  }

  async function handleToggleEpisode(
    seasonNumber: number,
    episodeNumber: number
  ): Promise<LatestEpisode | null | undefined> {
    const key = episodeKey(seasonNumber, episodeNumber);
    if (pendingKeys.has(key)) return undefined;

    const previousDates = getWatchedDates(watchedDates, key);
    const wasWatched = previousDates.length > 0;

    setPendingKeys((prev) => new Set(prev).add(key));
    setWatchedDates((prev) => {
      const next = new Map(prev);
      if (wasWatched) next.delete(key);
      else next.set(key, [todayIso()]);
      return next;
    });

    let nextEpisodeResult: LatestEpisode | null | undefined;

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

        toast.error(result.message);
      } else if (!wasWatched) {
        nextEpisodeResult = result.nextEpisode;

        // The catch-up lookup needs the full season tree. Tracking rows
        // seed the provider with seasons=null (see ShowTrackingProvider)
        // and only fetch it lazily when the episode modal opens, so a mark
        // from the row itself (modal never opened) would otherwise see an
        // empty tree and silently never offer to catch up. Load it here,
        // once, reusing the same loader the modal uses — a no-op if it's
        // already loaded or in flight, and skipped entirely when the
        // catch-up prompt is disabled for this show since the offer would
        // be suppressed anyway.
        let seasonsForOffer = seasons;
        if (seasonsForOffer === null && !catchUpDisabledRef.current) {
          seasonsForOffer = await handleLoadSeasons();
        }

        offerToMarkPriorEpisodes(
          getPriorUnwatchedAiredEpisodes(
            seasonsForOffer ?? [],
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

    return nextEpisodeResult;
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

        toast.error(result.message);
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

        toast.error(result.message);
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

  async function handleUpdateEpisodeWatchDate(
    seasonNumber: number,
    episodeNumber: number,
    previousDate: string | null,
    nextDate: string | null
  ) {
    const key = episodeKey(seasonNumber, episodeNumber);
    if (pendingKeys.has(key) || previousDate === nextDate) return;

    const previousDates = getWatchedDates(watchedDates, key);
    const index = previousDates.indexOf(previousDate);
    if (index === -1) return;

    const nextDates = [...previousDates];
    nextDates[index] = nextDate;

    setPendingKeys((prev) => new Set(prev).add(key));
    setWatchedDates((prev) => {
      const next = new Map(prev);
      next.set(key, nextDates);
      return next;
    });

    try {
      const result = await updateEpisodeWatchDateAction(
        showId,
        seasonNumber,
        episodeNumber,
        previousDate,
        nextDate
      );

      if (!result.ok) {
        setWatchedDates((prev) => {
          const next = new Map(prev);
          next.set(key, previousDates);
          return next;
        });

        toast.error(result.message);
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

    if (!isFullyWatched) {
      setPendingDateChoice({ kind: 'season', season });
      return;
    }

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
      episodeKeysToLock.forEach((key) => next.delete(key));
      return next;
    });

    try {
      const result = await unmarkSeasonWatchedAction(
        showId,
        season.seasonNumber
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

        toast.error(result.message);
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

  async function performMarkSeason(season: Season, watchedOn: string | null) {
    const seasonKey = `season-${season.seasonNumber}`;
    if (pendingKeys.has(seasonKey)) return;

    const markableEpisodes = season.episodes.filter(
      (ep) => getDaysUntilAir(ep.airDate) === null
    );
    if (markableEpisodes.length === 0) return;

    const episodesToToggle = markableEpisodes.filter(
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
        next.set(key, [watchedOn]);
      }
      return next;
    });

    try {
      const result = await markSeasonWatchedAction(
        showId,
        season.seasonNumber,
        markableEpisodes.map((ep) => ep.episodeNumber),
        watchedOn
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

        toast.error(result.message);
      } else {
        offerToMarkPriorEpisodes(
          getPriorUnwatchedAiredEpisodes(
            seasons ?? [],
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

        toast.error(result.message);
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

        toast.error(result.message);
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

  async function handleMarkShowWatched(watchedOn: string | null) {
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
        if (!next.has(key)) next.set(key, [watchedOn]);
      });
      return next;
    });

    try {
      const results = await Promise.all(
        regularMarkableSeasons.map(({ season, markableEpisodes }) =>
          markSeasonWatchedAction(
            showId,
            season.seasonNumber,
            markableEpisodes.map((ep) => ep.episodeNumber),
            watchedOn
          )
        )
      );

      const failedSeasons: {
        season: Season;
        markableEpisodes: SeasonEpisode[];
        message: string;
      }[] = [];

      results.forEach((result, i) => {
        if (!result.ok) {
          const { season, markableEpisodes } = regularMarkableSeasons[i];
          failedSeasons.push({
            season,
            markableEpisodes,
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

      toast.error(failedSeasons[0].message);
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
        message: string;
      }[] = [];

      results.forEach((result, i) => {
        if (!result.ok) {
          const { season, markableEpisodes } = regularMarkableSeasons[i];
          failedSeasons.push({
            season,
            markableEpisodes,
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

      toast.error(failedSeasons[0].message);
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

        toast.error(result.message);
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
      setPendingDateChoice({ kind: 'show' });
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

        toast.error(result.message);
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

        toast.error(result.message);
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(SHOW_STATUS_KEY);
        return next;
      });
    }
  }

  async function handleToggleFavourite() {
    if (pendingKeys.has(FAVOURITE_KEY)) return;

    const previousIsFavourite = isFavourite;
    const previousStatus = showStatus;
    const next = !isFavourite;
    // Unfavouriting a show with no watched episodes drops its tracking
    // entirely (see toggleFavourite -> pruneIfUntracked), so mirror that
    // locally instead of leaving a stale status behind.
    const willUntrack = !next && watchedDates.size === 0;

    setPendingKeys((prev) => new Set(prev).add(FAVOURITE_KEY));
    setIsFavourite(next);
    if (willUntrack) setShowStatusState(null);

    try {
      const result = await toggleFavouriteAction(showId, next);

      if (!result.ok) {
        setIsFavourite(previousIsFavourite);
        if (willUntrack) setShowStatusState(previousStatus);

        toast.error(result.message);
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(FAVOURITE_KEY);
        return next;
      });
    }
  }

  function handleApplyCustomImage(kind: ShowImageKind, url: string | null) {
    if (kind === 'poster') setCustomPosterUrl(url);
    else setCustomBannerUrl(url);
  }

  const value: ShowTrackingContextValue = {
    watchedDates,
    pendingKeys,
    seasons,
    cast,
    seasonsLoading,
    onLoadSeasons: handleLoadSeasons,
    onToggleEpisode: handleToggleEpisode,
    onRewatchEpisode: handleRewatchEpisode,
    onRemoveLastEpisodeRewatch: handleRemoveLastEpisodeRewatch,
    onUpdateEpisodeWatchDate: handleUpdateEpisodeWatchDate,
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
    isFavourite,
    onToggleFavourite: handleToggleFavourite,
    isTogglingFavourite: pendingKeys.has(FAVOURITE_KEY),
    isLoggedIn,
    openAuthDialog: () => setAuthDialogOpen(true),
    customPosterUrl,
    customBannerUrl,
    onApplyCustomImage: handleApplyCustomImage,
  };

  return (
    <ShowTrackingContext.Provider value={value}>
      {children}
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      {catchUpOffer !== null ? (
        <CatchUpDialog
          onYesToday={() => {
            handleMarkPriorEpisodes(catchUpOffer, todayIso());
            setCatchUpOffer(null);
          }}
          onYesNoDate={() => {
            handleMarkPriorEpisodes(catchUpOffer, null);
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
      {pendingDateChoice !== null ? (
        <DateChoiceDialog
          title={
            pendingDateChoice.kind === 'show'
              ? 'Mark show as watched?'
              : 'Mark season as watched?'
          }
          onPickToday={() => {
            if (pendingDateChoice.kind === 'show') {
              handleMarkShowWatched(todayIso());
            } else {
              performMarkSeason(pendingDateChoice.season, todayIso());
            }
            setPendingDateChoice(null);
          }}
          onPickNoDate={() => {
            if (pendingDateChoice.kind === 'show') {
              handleMarkShowWatched(null);
            } else {
              performMarkSeason(pendingDateChoice.season, null);
            }
            setPendingDateChoice(null);
          }}
          onCancel={() => setPendingDateChoice(null)}
        />
      ) : null}
    </ShowTrackingContext.Provider>
  );
}
