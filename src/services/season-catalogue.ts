import 'server-only';

import { isShowFinished } from '@/components/ShowTracker/utils';

import { createClient } from '@/supabase/server';

import { getViewerId } from './viewer';

export type SeasonRow = {
  tmdb_show_id: number;
  season_number: number;
  episode_count: number;
  aired_count: number;
  finished_airing: boolean;
};

// Structural rather than TMDBSeriesDetailsRaw, for the same reason
// CatalogueSource is: this must accept a response that might be incomplete.
export type SeasonSource = {
  status?: string;
  seasons?: { season_number: number; episode_count: number | null }[];
  last_episode_to_air?: {
    season_number: number;
    episode_number: number;
  } | null;
  next_episode_to_air?: {
    season_number: number;
    episode_number: number;
  } | null;
};

// A season that has finished airing never changes again — that is the property
// the whole design rests on, because it lets the table say which rows can
// possibly be stale instead of having to ask TMDB.
export function seasonRowsFromTmdb(
  id: number,
  json: SeasonSource | null | undefined
): SeasonRow[] {
  if (!json?.seasons) return [];

  const lastAired = json.last_episode_to_air ?? null;
  const showEnded = isShowFinished(json.status ?? null);

  return json.seasons.map((season) => {
    const episodeCount = season.episode_count ?? 0;
    const n = season.season_number;

    let airedCount: number;
    let finished: boolean;

    if (showEnded) {
      // Ended/Canceled means nothing further is coming — but that is not the
      // same as "every listed season aired". TMDB keeps announced seasons in
      // `seasons[]` after a cancellation, and those never aired at all. Since
      // a wrongly-finished row is never revisited, anything that did not
      // demonstrably air stays unfinished.
      const everAired = lastAired !== null && n <= lastAired.season_number;

      if (!everAired) {
        airedCount = 0;
        finished = false;
      } else if (lastAired && n === lastAired.season_number) {
        // The final season aired. If the show was cancelled part-way through
        // it, only what aired exists, so cap at the last aired episode. A
        // missing/zero episode_count here is untrustworthy metadata rather
        // than a real count, so it stays unfinished instead of borrowing
        // lastAired.episode_number as a stand-in aired count.
        airedCount =
          episodeCount > 0
            ? Math.min(episodeCount, lastAired.episode_number)
            : 0;
        finished = n > 0 && airedCount > 0;
      } else {
        airedCount = episodeCount;
        finished = n > 0 && episodeCount > 0;
      }
    } else if (!lastAired || n > lastAired.season_number) {
      // Not started yet.
      airedCount = 0;
      finished = false;
    } else if (n < lastAired.season_number) {
      // A later season is airing, so this one is done.
      airedCount = episodeCount;
      finished = n > 0;
    } else {
      // The currently airing season. It is finished only if its finale has
      // aired and nothing further is scheduled — without this a viewer who
      // watches a finale would not be credited with finishing the season
      // until the next season began.
      airedCount = lastAired.episode_number;
      finished =
        n > 0 &&
        !json.next_episode_to_air &&
        episodeCount > 0 &&
        lastAired.episode_number >= episodeCount;
      if (finished) airedCount = episodeCount;
    }

    return {
      tmdb_show_id: id,
      season_number: n,
      episode_count: episodeCount,
      aired_count: airedCount,
      finished_airing: finished,
    };
  });
}

// One round-trip. Deduped because a single INSERT ... ON CONFLICT cannot touch
// the same key twice — Postgres raises 21000 and discards the whole batch.
export async function upsertSeasonCatalogue(rows: SeasonRow[]): Promise<void> {
  if (rows.length === 0) return;

  try {
    const viewerId = await getViewerId();
    if (!viewerId) return;

    const deduped = new Map<string, SeasonRow>();
    for (const row of rows) {
      deduped.set(`${row.tmdb_show_id}-${row.season_number}`, row);
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('upsert_season_catalogue', {
      p_rows: Array.from(deduped.values()),
    });
    if (error && error.code !== '42501') {
      console.warn('[season-catalogue] upsert failed', error.message);
    }
  } catch (err) {
    console.warn('[season-catalogue] upsert threw', err);
  }
}
