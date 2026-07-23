import 'server-only';

import {
  buildWatchedDatesMap,
  getWatchNextEpisode,
  isShowFinished,
} from '@/components/ShowTracker/utils';

import { TMDB_POSTER_LARGE_BASE_URL } from '@/consts';

import { createClient } from '@/supabase/server';

import type {
  EpisodeWatch,
  LatestEpisode,
  ShowStatus,
  ShowTracking,
} from '@/types';

import { ServiceError } from './errors';
import { getTmdbShowFullDetails } from './tv-shows';
import { getViewerId, requireViewer } from './viewer';

const STATUS_CODES: Record<ShowStatus, number> = {
  watching: 1,
  watch_later: 2,
  paused: 3,
  dropped: 4,
  completed: 5,
};

const STATUS_BY_CODE = Object.fromEntries(
  Object.entries(STATUS_CODES).map(([status, code]) => [code, status])
) as Record<number, ShowStatus>;

function statusToCode(status: ShowStatus): number {
  return STATUS_CODES[status];
}

function codeToStatus(code: number): ShowStatus {
  const status = STATUS_BY_CODE[code];
  if (!status) throw new ServiceError(`Unknown status code: ${code}`);
  return status;
}

export async function getShowTrackingForUser(
  userId: string,
  showId: number
): Promise<ShowTracking | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('show_tracking')
    .select(
      'tmdb_show_id, status, is_favourite, skip_catch_up_prompt, created_at, custom_poster_url, custom_banner_url'
    )
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .maybeSingle();

  if (error) throw new ServiceError(error.message, error.code);
  if (!data) return null;

  return {
    tmdbShowId: data.tmdb_show_id,
    status: codeToStatus(data.status),
    isFavourite: data.is_favourite,
    skipCatchUpPrompt: data.skip_catch_up_prompt,
    createdAt: data.created_at,
    customPosterUrl: data.custom_poster_url,
    customBannerUrl: data.custom_banner_url,
  };
}

export async function getShowTracking(
  showId: number
): Promise<ShowTracking | null> {
  const userId = await getOptionalUserId();
  if (!userId) return null;

  return getShowTrackingForUser(userId, showId);
}

type WatchedEpisodeRow = {
  id: number;
  season_number: number;
  episode_number: number;
  watched_on: string | null;
  created_at: string;
};

// PostgREST caps un-ranged responses at the project's "Max rows" setting
// (1,000 here), silently truncating anything larger with no error — and,
// verified directly against this project, the same cap applies to
// set-returning RPC results, not just table reads (1,200 seeded rows
// returned exactly 1,000 over REST). A single show can carry well over that
// many episode_watches rows once rewatches and daily-airing formats are
// counted (one real show alone has 1,206), and several of the RPCs below
// return one row per show or per (show, season) for the whole library, so
// any full read — table or RPC, one show or many — has to page through
// explicitly rather than trust an un-ranged response.
const PAGE_SIZE = 1000;

// Shared paging loop for the set-returning RPCs below. `fetchPage` should
// call the RPC with the given p_limit/p_offset and return that page's rows
// (throwing ServiceError on a Postgres error, same as every other call in
// this file). Loops until a page comes back shorter than `pageSize`, which
// is the only reliable end-of-data signal for LIMIT/OFFSET paging — an
// exactly-full last page would otherwise be indistinguishable from "there
// might be more".
export async function fetchAllPages<T>(
  fetchPage: (limit: number, offset: number) => Promise<T[]>,
  pageSize: number = PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchPage(pageSize, offset);
    if (page.length === 0) break;

    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

function mapAndSortWatchedEpisodeRows(
  rows: WatchedEpisodeRow[]
): EpisodeWatch[] {
  const watched = rows.map((row) => ({
    id: row.id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    watchedOn: row.watched_on,
    createdAt: row.created_at,
  }));

  watched.sort((a, b) => {
    const aKey = a.watchedOn ?? a.createdAt.slice(0, 10);
    const bKey = b.watchedOn ?? b.createdAt.slice(0, 10);
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });

  return watched.map(({ id, seasonNumber, episodeNumber, watchedOn }) => ({
    id,
    seasonNumber,
    episodeNumber,
    watchedOn,
  }));
}

export async function getWatchedEpisodesForUser(
  userId: string,
  showId: number
): Promise<EpisodeWatch[]> {
  const supabase = await createClient();
  const rows: WatchedEpisodeRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('episode_watches')
      .select('id, season_number, episode_number, watched_on, created_at')
      .eq('user_id', userId)
      .eq('tmdb_show_id', showId)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new ServiceError(error.message, error.code);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return mapAndSortWatchedEpisodeRows(rows);
}

export async function getWatchedEpisodes(
  showId: number
): Promise<EpisodeWatch[]> {
  const userId = await getOptionalUserId();
  if (!userId) return [];

  return getWatchedEpisodesForUser(userId, showId);
}

// Batched version of getWatchedEpisodesForUser for N shows in one query —
// use this instead of calling getWatchedEpisodesForUser in a loop.
export async function getWatchedEpisodesForShows(
  userId: string,
  showIds: number[]
): Promise<Map<number, EpisodeWatch[]>> {
  const map = new Map<number, EpisodeWatch[]>();
  if (showIds.length === 0) return map;

  const supabase = await createClient();
  const allRows: (WatchedEpisodeRow & { tmdb_show_id: number })[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('episode_watches')
      .select(
        'id, tmdb_show_id, season_number, episode_number, watched_on, created_at'
      )
      .eq('user_id', userId)
      .in('tmdb_show_id', showIds)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new ServiceError(error.message, error.code);
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  const rowsByShow = new Map<number, WatchedEpisodeRow[]>();
  for (const row of allRows) {
    const rows = rowsByShow.get(row.tmdb_show_id) ?? [];
    rows.push(row);
    rowsByShow.set(row.tmdb_show_id, rows);
  }

  for (const [showId, rows] of rowsByShow) {
    map.set(showId, mapAndSortWatchedEpisodeRows(rows));
  }

  return map;
}

type RecentWatchedEpisodeRow = {
  id: number;
  tmdbShowId: number;
  seasonNumber: number;
  episodeNumber: number;
  watchedOn: string;
};

// Bounded by `.limit(limit * 10)`, which is always well under PostgREST's
// 1,000-row cap for this function's one caller (limit=10 → 100 rows). The
// ×10 headroom absorbs same-episode rewatch duplicates before they're
// deduped below. If a future caller ever passes a limit above ~100, this
// stops being safely under the cap and would need the same paging/SQL-side
// treatment as getWatchedEpisodesForUser.
export async function getRecentWatchedEpisodesForUser(
  userId: string,
  limit: number
): Promise<RecentWatchedEpisodeRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('episode_watches')
    .select('id, tmdb_show_id, season_number, episode_number, watched_on')
    .eq('user_id', userId)
    .not('watched_on', 'is', null)
    .order('watched_on', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit * 10);

  if (error) throw new ServiceError(error.message, error.code);

  const seenEpisodes = new Set<string>();
  const deduped: RecentWatchedEpisodeRow[] = [];

  for (const row of data ?? []) {
    if (row.watched_on === null) continue;
    const key = `${row.tmdb_show_id}-${row.season_number}-${row.episode_number}`;
    if (seenEpisodes.has(key)) continue;
    seenEpisodes.add(key);

    deduped.push({
      id: row.id,
      tmdbShowId: row.tmdb_show_id,
      seasonNumber: row.season_number,
      episodeNumber: row.episode_number,
      watchedOn: row.watched_on,
    });
    if (deduped.length >= limit) break;
  }

  return deduped;
}

export async function getRecentWatchedEpisodes(
  limit: number
): Promise<RecentWatchedEpisodeRow[]> {
  const userId = await getOptionalUserId();
  if (!userId) return [];

  return getRecentWatchedEpisodesForUser(userId, limit);
}

// Like getRecentWatchedEpisodesForUser, but deduped by show instead of by
// episode — each show appears once, with only its most recently watched
// episode, for "recent activity" views that show one card per show.
//
// The dedupe (most recent dated watch per show) and the ordering (newest
// watched_on first, ties broken by highest id) both happen inside the
// `recent_watched_shows` SQL function rather than in TypeScript. A bulk
// "mark watched" action can insert hundreds of same-day rows for one show,
// so deduping requires scanning the user's full dated watch history — doing
// that client-side meant fetching every dated row un-ranged, which silently
// truncated at PostgREST's 1,000-row cap once that history grew past a
// thousand rows. Doing the dedupe in SQL first means only `limit` rows ever
// cross the wire.
export async function getRecentWatchedShowsForUser(
  userId: string,
  limit: number
): Promise<RecentWatchedEpisodeRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('recent_watched_shows', {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) throw new ServiceError(error.message, error.code);

  return (data ?? []).map((row) => ({
    id: row.id,
    tmdbShowId: row.tmdb_show_id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    watchedOn: row.watched_on,
  }));
}

type FinishedShowRow = {
  tmdbShowId: number;
  watchedOn: string;
  rewatch: boolean;
};

// Diary entries: one per show the user has marked 'completed'. Dated by
// max(watched_on) across every one of the show's episode_watches rows, not
// by a single representative episode — so a dated watch on any episode can
// move the date, and marked as a rewatch when *any* episode in the show
// (not one specific one) has more than one row. Only dated rows count
// (`watched_on is not null`): the import deliberately nulls 2,240 watch
// dates, so a finished show whose only watched_on values live on nulled
// rows won't produce a max() and drops out of the diary entirely — expected
// fallout of that nulling, not a bug here.
//
// Paged: finished_shows is a set-returning RPC, and PostgREST's row cap
// applies to those the same as it does table reads — see fetchAllPages.
export async function getFinishedShowsForUser(
  userId: string
): Promise<FinishedShowRow[]> {
  const supabase = await createClient();

  const rows = await fetchAllPages(async (limit, offset) => {
    const { data, error } = await supabase.rpc('finished_shows', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  });

  return rows.map((row) => ({
    tmdbShowId: row.tmdb_show_id,
    watchedOn: row.finished_on,
    rewatch: row.rewatch,
  }));
}

type FinishedSeasonRow = {
  tmdbShowId: number;
  seasonNumber: number;
  watchedOn: string;
  rewatch: boolean;
};

// Diary entries: one per regular season the user has fully watched,
// regardless of the show's overall tracking status (an ongoing show can
// still have individually finished seasons). Dated by max(watched_on)
// across every episode in that season, not by the season's last episode
// specifically, and marked as a rewatch when *any* episode in the season
// has more than one episode_watches row. Only dated rows count
// (`watched_on is not null`), same caveat as getFinishedShowsForUser above:
// the import nulls 2,240 watch dates, so a season whose coverage depends on
// one of those nulled rows produces no max() and silently drops out of the
// diary — deliberate, not a bug.
//
// Paged: finished_seasons is a set-returning RPC and subject to the same
// PostgREST row cap as table reads — see fetchAllPages. The user's export
// has 1,167 finished (show, season) pairs, comfortably past the 1,000-row
// cap on its own.
export async function getFinishedSeasonsForUser(
  userId: string
): Promise<FinishedSeasonRow[]> {
  const supabase = await createClient();

  const rows = await fetchAllPages(async (limit, offset) => {
    const { data, error } = await supabase.rpc('finished_seasons', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  });

  return rows.map((row) => ({
    tmdbShowId: row.tmdb_show_id,
    seasonNumber: row.season_number,
    watchedOn: row.finished_on,
    rewatch: row.rewatch,
  }));
}

export type TrackingRow = {
  tmdbShowId: number;
  name: string;
  posterUrl: string | null;
  network: string | null;
  nextSeasonNumber: number;
  nextEpisodeNumber: number;
  backlogCount: number;
  estimatedMinutes: number;
  lastWatchedOn: string | null;
};

// One Postgres function decides everything structural (backlog, next
// unwatched episode) for every tracked show at once, expanding aired-episode
// slots from season_catalogue server-side — see the tracking_rows migration
// for why that has to happen in SQL rather than by fetching per-episode rows
// here. Returns one row per show *with* a backlog; a caught-up show is
// absent entirely, not a zero-backlog row.
//
// "Next episode" is the furthest-watched-episode-plus-one, matching
// getWatchNextEpisode's "resume where you left off" semantics — the same
// meaning the rest of the app uses — not the lowest unwatched episode. A
// show the user hasn't watched anything of has no furthest-watched episode,
// so it resolves to that show's very first aired episode; that's a
// deliberate "start here" affordance, not a regression from the old
// zero-backlog "latest episode" display.
//
// Paged: tracking_rows is a set-returning RPC and subject to PostgREST's
// row cap exactly like table reads — see fetchAllPages.
export async function getTrackingRows(userId: string): Promise<TrackingRow[]> {
  const supabase = await createClient();

  const rows = await fetchAllPages(async (limit, offset) => {
    const { data, error } = await supabase.rpc('tracking_rows', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  });

  return rows.map((row) => ({
    tmdbShowId: row.tmdb_show_id,
    name: row.name,
    posterUrl: row.poster_path
      ? `${TMDB_POSTER_LARGE_BASE_URL}${row.poster_path}`
      : null,
    network: row.network,
    nextSeasonNumber: row.next_season,
    nextEpisodeNumber: row.next_episode,
    backlogCount: row.backlog_count,
    estimatedMinutes: row.estimated_minutes,
    lastWatchedOn: row.last_watched_on,
  }));
}

// Not paged: show_tracking has a (user_id, tmdb_show_id) primary key, so a
// user can have at most one row per show — row count here is bounded by
// distinct shows tracked, not by watch history. Post-import that's ~455
// shows, far under the 1,000-row PostgREST cap. Unlike episode_watches,
// nothing about this table lets a single row multiply.
export async function getShowsForUser(
  userId: string,
  status?: ShowStatus
): Promise<ShowTracking[]> {
  const supabase = await createClient();

  let query = supabase
    .from('show_tracking')
    .select(
      'tmdb_show_id, status, is_favourite, skip_catch_up_prompt, created_at, custom_poster_url, custom_banner_url'
    )
    .eq('user_id', userId);

  if (status) query = query.eq('status', statusToCode(status));

  const { data, error } = await query;
  if (error) throw new ServiceError(error.message, error.code);

  return (data ?? []).map((row) => ({
    tmdbShowId: row.tmdb_show_id,
    status: codeToStatus(row.status),
    isFavourite: row.is_favourite,
    skipCatchUpPrompt: row.skip_catch_up_prompt,
    createdAt: row.created_at,
    customPosterUrl: row.custom_poster_url,
    customBannerUrl: row.custom_banner_url,
  }));
}

export async function getMyShows(status?: ShowStatus): Promise<ShowTracking[]> {
  const userId = await getOptionalUserId();
  if (!userId) return [];

  return getShowsForUser(userId, status);
}

// Not paged: same reasoning as getShowsForUser above — bounded by the
// (user_id, tmdb_show_id) primary key, not by watch history.
export async function getFavouriteShowsForUser(
  userId: string
): Promise<ShowTracking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('show_tracking')
    .select(
      'tmdb_show_id, status, is_favourite, skip_catch_up_prompt, created_at, custom_poster_url, custom_banner_url'
    )
    .eq('user_id', userId)
    .eq('is_favourite', true);

  if (error) throw new ServiceError(error.message, error.code);

  return (data ?? []).map((row) => ({
    tmdbShowId: row.tmdb_show_id,
    status: codeToStatus(row.status),
    isFavourite: row.is_favourite,
    skipCatchUpPrompt: row.skip_catch_up_prompt,
    createdAt: row.created_at,
    customPosterUrl: row.custom_poster_url,
    customBannerUrl: row.custom_banner_url,
  }));
}

// Per-show watched-episode count for a batch of shows, deduped by
// season+episode so rewatches don't inflate the count — matches the
// "markable episodes watched" semantics used by the progress bars.
//
// Paged: watched_episode_counts returns one row per show the user has ever
// watched anything of, not just the requested showIds (filtered client-side
// below), so its row count grows with the whole library and is subject to
// PostgREST's row cap like every other set-returning RPC here — see
// fetchAllPages.
export async function getWatchedEpisodeCountsForUser(
  userId: string,
  showIds: number[]
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (showIds.length === 0) return counts;

  const supabase = await createClient();
  const rows = await fetchAllPages(async (limit, offset) => {
    const { data, error } = await supabase.rpc('watched_episode_counts', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  });

  const showIdSet = new Set(showIds);
  for (const row of rows) {
    if (!showIdSet.has(row.tmdb_show_id)) continue;
    counts.set(row.tmdb_show_id, row.watched_count);
  }

  return counts;
}

export async function getWatchStatsForUser(userId: string): Promise<{
  totalWatchMinutes: number;
  totalEpisodes: number;
  episodesThisYear: number;
  finishedShowsCount: number;
}> {
  const supabase = await createClient();

  const currentYear = new Date().getFullYear();
  const { data, error } = await supabase.rpc('watch_stats', {
    p_user_id: userId,
    p_year: currentYear,
  });

  if (error) throw new ServiceError(error.message, error.code);

  const row = data?.[0];

  return {
    totalWatchMinutes: row?.total_minutes ?? 0,
    totalEpisodes: row?.total_episodes ?? 0,
    episodesThisYear: row?.episodes_this_year ?? 0,
    finishedShowsCount: row?.finished_shows_count ?? 0,
  };
}

async function requireUserId(): Promise<string> {
  const viewer = await requireViewer();
  return viewer.id;
}

async function getOptionalUserId(): Promise<string | null> {
  return getViewerId();
}

export async function setShowStatus(
  showId: number,
  status: ShowStatus
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { error } = await supabase
    .from('show_tracking')
    .upsert(
      { user_id: userId, tmdb_show_id: showId, status: statusToCode(status) },
      { onConflict: 'user_id,tmdb_show_id' }
    );

  if (error) throw new ServiceError(error.message, error.code);
}
export async function removeShowTracking(showId: number): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { error } = await supabase
    .from('show_tracking')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId);

  if (error) throw new ServiceError(error.message, error.code);
}

export async function setSkipCatchUpPrompt(
  showId: number,
  skip: boolean
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { error } = await supabase
    .from('show_tracking')
    .update({ skip_catch_up_prompt: skip })
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId);

  if (error) throw new ServiceError(error.message, error.code);
}

export async function toggleFavourite(
  showId: number,
  next: boolean
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data: existing, error: selectError } = await supabase
    .from('show_tracking')
    .select('tmdb_show_id')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .maybeSingle();

  if (selectError) {
    throw new ServiceError(selectError.message, selectError.code);
  }

  if (existing) {
    const { error } = await supabase
      .from('show_tracking')
      .update({ is_favourite: next })
      .eq('user_id', userId)
      .eq('tmdb_show_id', showId);

    if (error) throw new ServiceError(error.message, error.code);

    if (!next) await pruneIfUntracked(supabase, userId, showId);
    return;
  }

  const { error } = await supabase.from('show_tracking').insert({
    user_id: userId,
    tmdb_show_id: showId,
    status: statusToCode('watching'),
    is_favourite: next,
  });

  if (error) throw new ServiceError(error.message, error.code);
}

export async function markEpisodeWatched(
  showId: number,
  season: number,
  episode: number,
  watchedOn?: string
): Promise<LatestEpisode | null> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const insertRow: {
    user_id: string;
    tmdb_show_id: number;
    season_number: number;
    episode_number: number;
    watched_on?: string;
  } = {
    user_id: userId,
    tmdb_show_id: showId,
    season_number: season,
    episode_number: episode,
  };
  if (watchedOn) insertRow.watched_on = watchedOn;

  const { error } = await supabase.from('episode_watches').insert(insertRow);
  if (error) throw new ServiceError(error.message, error.code);

  return autoUpdateStatus(supabase, userId, showId);
}

export async function updateEpisodeWatchDate(
  showId: number,
  season: number,
  episode: number,
  previousDate: string | null,
  nextDate: string | null
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  let query = supabase
    .from('episode_watches')
    .select('id')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season)
    .eq('episode_number', episode);
  query =
    previousDate === null
      ? query.is('watched_on', null)
      : query.eq('watched_on', previousDate);

  const { data: rows, error: selectError } = await query.limit(1);

  if (selectError) {
    throw new ServiceError(selectError.message, selectError.code);
  }
  if (!rows || rows.length === 0) {
    throw new ServiceError('Watch date not found', 'not_found');
  }

  const { error } = await supabase
    .from('episode_watches')
    .update({ watched_on: nextDate })
    .eq('id', rows[0].id)
    .eq('user_id', userId);

  if (error) throw new ServiceError(error.message, error.code);
}

// Returns the show's next unwatched episode (or null if there isn't one, or
// the TMDB fetch failed) so callers on the mark-watched path — where the
// client no longer holds the show's full season tree — can update instantly
// without a second round trip. getTmdbShowFullDetails below is already
// fetched for the regularEpisodeCount/completion check that follows; reusing
// its `meta.seasons` here costs nothing extra.
async function autoUpdateStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  showId: number
): Promise<LatestEpisode | null> {
  const { data: tracking, error: trackingError } = await supabase
    .from('show_tracking')
    .select('status')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .maybeSingle();

  if (trackingError) {
    throw new ServiceError(trackingError.message, trackingError.code);
  }

  if (!tracking) {
    const { error } = await supabase.from('show_tracking').insert({
      user_id: userId,
      tmdb_show_id: showId,
      status: statusToCode('watching'),
    });

    if (error) throw new ServiceError(error.message, error.code);
  } else if (tracking.status === statusToCode('watch_later')) {
    const { error } = await supabase
      .from('show_tracking')
      .update({ status: statusToCode('watching') })
      .eq('user_id', userId)
      .eq('tmdb_show_id', showId);

    if (error) throw new ServiceError(error.message, error.code);
  }

  const full = await getTmdbShowFullDetails(showId);
  if (!full) return null;

  // Fetched once and reused for both the completion check below and the
  // next-episode lookup — replaces what used to be a second, near-identical
  // paged read scoped to season_number > 0.
  const watched = await getWatchedEpisodesForUser(userId, showId);
  const watchedDates = buildWatchedDatesMap(watched);
  const nextEpisode = getWatchNextEpisode(full.meta.seasons, watchedDates);

  const regularEpisodeCount = full.meta.seasons
    .filter((season) => season.seasonNumber > 0)
    .reduce(
      (total, season) =>
        total + (season.episodeCount ?? season.episodes.length),
      0
    );

  if (regularEpisodeCount === 0) return nextEpisode;

  const distinctWatched = new Set<string>();
  for (const entry of watched) {
    if (entry.seasonNumber <= 0) continue;
    distinctWatched.add(`${entry.seasonNumber}-${entry.episodeNumber}`);
  }

  if (
    distinctWatched.size >= regularEpisodeCount &&
    isShowFinished(full.details.status)
  ) {
    const { error } = await supabase
      .from('show_tracking')
      .update({ status: statusToCode('completed') })
      .eq('user_id', userId)
      .eq('tmdb_show_id', showId);

    if (error) throw new ServiceError(error.message, error.code);
  }

  return nextEpisode;
}

async function pruneIfUntracked(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  showId: number
): Promise<void> {
  const { count, error } = await supabase
    .from('episode_watches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId);

  if (error) throw new ServiceError(error.message, error.code);
  if ((count ?? 0) > 0) return;

  const { error: deleteError } = await supabase
    .from('show_tracking')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId);

  if (deleteError) {
    throw new ServiceError(deleteError.message, deleteError.code);
  }
}

export async function unmarkEpisodeWatched(
  showId: number,
  season: number,
  episode: number
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { error } = await supabase
    .from('episode_watches')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season)
    .eq('episode_number', episode);

  if (error) throw new ServiceError(error.message, error.code);

  await pruneIfUntracked(supabase, userId, showId);
}

export async function removeLastEpisodeRewatch(
  showId: number,
  season: number,
  episode: number
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data: rows, error: selectError } = await supabase
    .from('episode_watches')
    .select('id')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season)
    .eq('episode_number', episode)
    .order('id', { ascending: false })
    .limit(1);

  if (selectError) {
    throw new ServiceError(selectError.message, selectError.code);
  }
  if (!rows || rows.length === 0) return;

  const { error: deleteError } = await supabase
    .from('episode_watches')
    .delete()
    .eq('id', rows[0].id)
    .eq('user_id', userId);

  if (deleteError) {
    throw new ServiceError(deleteError.message, deleteError.code);
  }

  await pruneIfUntracked(supabase, userId, showId);
}

export async function markSeasonWatched(
  showId: number,
  season: number,
  episodeNumbers: number[],
  watchedOn: string | null
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  // Not paged: unlike the show-wide reads above, this is scoped to a single
  // season, so row count is bounded by that season's episode count times
  // however many times the user has rewatched it — realistically nowhere
  // near the 1,000-row PostgREST cap (even Big Brother Brazil's ~1,200
  // show-wide watches are spread across many seasons/years, not one). A
  // truncated read here would only under-count `alreadyWatched`, causing an
  // extra rewatch-equivalent row on retry rather than any data loss.
  const { data: existingRows, error: existingError } = await supabase
    .from('episode_watches')
    .select('episode_number')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season);

  if (existingError) {
    throw new ServiceError(existingError.message, existingError.code);
  }

  const alreadyWatched = new Set(
    (existingRows ?? []).map((row) => row.episode_number)
  );
  const toInsert = episodeNumbers.filter((n) => !alreadyWatched.has(n));

  if (toInsert.length > 0) {
    const { error } = await supabase.from('episode_watches').insert(
      toInsert.map((episodeNumber) => ({
        user_id: userId,
        tmdb_show_id: showId,
        season_number: season,
        episode_number: episodeNumber,
        watched_on: watchedOn,
      }))
    );

    if (error) throw new ServiceError(error.message, error.code);
  }

  await autoUpdateStatus(supabase, userId, showId);
}

export async function rewatchSeason(
  showId: number,
  season: number,
  episodeNumbers: number[]
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { error } = await supabase.from('episode_watches').insert(
    episodeNumbers.map((episodeNumber) => ({
      user_id: userId,
      tmdb_show_id: showId,
      season_number: season,
      episode_number: episodeNumber,
    }))
  );

  if (error) throw new ServiceError(error.message, error.code);

  await autoUpdateStatus(supabase, userId, showId);
}

export async function removeLastSeasonRewatch(
  showId: number,
  season: number,
  episodeNumbers: number[]
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  // Not paged: scoped to one season and further filtered to the specific
  // episode numbers being un-rewatched (at most one season's worth), so row
  // count is bounded the same way as markSeasonWatched above — nowhere near
  // the 1,000-row PostgREST cap in practice.
  const { data: rows, error: selectError } = await supabase
    .from('episode_watches')
    .select('id, episode_number')
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season)
    .in('episode_number', episodeNumbers)
    .order('id', { ascending: false });

  if (selectError) {
    throw new ServiceError(selectError.message, selectError.code);
  }

  const seenEpisodes = new Set<number>();
  const idsToDelete: number[] = [];
  for (const row of rows ?? []) {
    if (seenEpisodes.has(row.episode_number)) continue;
    seenEpisodes.add(row.episode_number);
    idsToDelete.push(row.id);
  }

  if (idsToDelete.length === 0) return;

  const { error: deleteError } = await supabase
    .from('episode_watches')
    .delete()
    .eq('user_id', userId)
    .in('id', idsToDelete);

  if (deleteError) {
    throw new ServiceError(deleteError.message, deleteError.code);
  }

  await pruneIfUntracked(supabase, userId, showId);
}

export async function unmarkSeasonWatched(
  showId: number,
  season: number
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { error } = await supabase
    .from('episode_watches')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_show_id', showId)
    .eq('season_number', season);

  if (error) throw new ServiceError(error.message, error.code);

  await pruneIfUntracked(supabase, userId, showId);
}

export async function deleteWatch(watchId: number): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('episode_watches')
    .delete()
    .eq('id', watchId)
    .eq('user_id', userId)
    .select('tmdb_show_id')
    .maybeSingle();

  if (error) throw new ServiceError(error.message, error.code);
  if (!data) return;

  await pruneIfUntracked(supabase, userId, data.tmdb_show_id);
}
