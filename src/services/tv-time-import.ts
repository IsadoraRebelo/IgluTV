// Parsing and mapping for TV Time GDPR exports. Deliberately free of any
// TMDB or Supabase dependency so every rule here is directly unit testable.
import type { ShowStatus } from '@/types/tracking';

export type TvTimeWatchRow = {
  tvdbShowId: string;
  tvdbEpisodeId: string;
  seriesName: string;
  seasonNumber: number;
  episodeNumber: number;
  createdAt: string;
  isRewatch: boolean;
};

export type TvTimeSeriesRow = {
  tvdbShowId: string;
  seriesName: string;
  isFollowed: boolean;
  isArchived: boolean;
  isForLater: boolean;
  followedAt: string | null;
};

export type TvTimeSpecialStatusRow = {
  tvdbShowId: string;
  status: 'favorite' | 'for_later';
};

// RFC 4180. TV Time quotes any field containing a comma and escapes an
// embedded quote by doubling it.
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const header = rows.shift();
  if (!header) return [];

  return rows
    .filter((cells) => cells.some((cell) => cell !== ''))
    .map((cells) =>
      Object.fromEntries(header.map((name, i) => [name, cells[i] ?? '']))
    );
}

function recordKind(key: string): string {
  if (key.startsWith('watch-episode')) return 'watch-episode';
  if (key.startsWith('rewatch-episode')) return 'rewatch-episode';
  if (key.startsWith('user-series')) return 'user-series';
  return 'other';
}

// followed_at is microseconds since epoch.
function microsToIso(micros: string): string | null {
  const value = Number(micros);
  if (!micros || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value / 1000).toISOString();
}

export function parseTrackingRecords(csv: string): {
  watches: TvTimeWatchRow[];
  series: TvTimeSeriesRow[];
} {
  const watches: TvTimeWatchRow[] = [];
  const series: TvTimeSeriesRow[] = [];

  for (const row of parseCsv(csv)) {
    const kind = recordKind(row.key ?? '');

    if (kind === 'watch-episode' || kind === 'rewatch-episode') {
      // season_number/episode_number are the canonical TVDB numbers;
      // s_no/ep_no are TV Time's display numbering and disagree on ~0.4%
      // of rows.
      const seasonNumber = Number(row.season_number);
      const episodeNumber = Number(row.episode_number);
      const tvdbShowId = row.s_id ?? '';

      if (!tvdbShowId) continue;
      if (!Number.isFinite(seasonNumber) || !Number.isFinite(episodeNumber)) {
        continue;
      }

      watches.push({
        tvdbShowId,
        tvdbEpisodeId: row.ep_id || row.episode_id || '',
        seriesName: row.series_name ?? '',
        seasonNumber,
        episodeNumber,
        createdAt: row.created_at ?? '',
        isRewatch: kind === 'rewatch-episode',
      });
      continue;
    }

    if (kind === 'user-series') {
      const tvdbShowId = row.s_id ?? '';
      if (!tvdbShowId) continue;

      series.push({
        tvdbShowId,
        seriesName: row.series_name ?? '',
        isFollowed: row.is_followed === 'true',
        isArchived: row.is_archived === 'true',
        isForLater: row.is_for_later === 'true',
        followedAt: microsToIso(row.followed_at ?? ''),
      });
    }
  }

  return { watches, series };
}

export function parseSpecialStatus(csv: string): TvTimeSpecialStatusRow[] {
  const out: TvTimeSpecialStatusRow[] = [];

  for (const row of parseCsv(csv)) {
    if (row.status !== 'favorite' && row.status !== 'for_later') continue;
    if (!row.tv_show_id) continue;
    out.push({ tvdbShowId: row.tv_show_id, status: row.status });
  }

  return out;
}

export type PlannedWatch = {
  seasonNumber: number;
  episodeNumber: number;
  tvdbEpisodeId: string;
  createdAt: string;
  watchedOn: string | null;
};

export type ShowImportGroup = {
  tvdbShowId: string;
  seriesName: string;
  watches: PlannedWatch[];
  isFollowed: boolean;
  isArchived: boolean;
  isForLater: boolean;
  followedAt: string | null;
  isFavourite: boolean;
};

// PERSONAL: 2,194 rows in one account's export carry this date, all stamped
// between 02:00 and 03:00 — a bulk backfill from account creation, not real
// viewing dates. Delete this constant and its use in buildImportPlan to
// remove the rule.
export const BACKFILL_DATE = '2016-06-01';

function dateOf(timestamp: string): string {
  return timestamp.slice(0, 10);
}

// TV Time writes episode_number = 0 as a placeholder for episodes it could
// not number, so (season, episode) is NOT unique: in one real export 101
// distinct episodes collapse onto 10 such keys (Digimon S3E0 alone accounts
// for 51). The TVDB episode id is unique across every watch row, so identity
// keys on it; the numbers are only a fallback for a row that somehow has no
// episode id.
function episodeIdentity(row: TvTimeWatchRow): string {
  return row.tvdbEpisodeId || `${row.seasonNumber}-${row.episodeNumber}`;
}

export function buildImportPlan(input: {
  watches: TvTimeWatchRow[];
  series: TvTimeSeriesRow[];
  specialStatus: TvTimeSpecialStatusRow[];
}): ShowImportGroup[] {
  const seriesById = new Map(input.series.map((s) => [s.tvdbShowId, s]));
  const favourites = new Set(
    input.specialStatus
      .filter((s) => s.status === 'favorite')
      .map((s) => s.tvdbShowId)
  );
  const forLater = new Set(
    input.specialStatus
      .filter((s) => s.status === 'for_later')
      .map((s) => s.tvdbShowId)
  );

  // Bucket every watch and rewatch row by show + episode so the rewatch
  // rules can see all watches of one episode together.
  const byShow = new Map<string, Map<string, TvTimeWatchRow[]>>();
  const namesByShow = new Map<string, string>();

  for (const row of input.watches) {
    if (row.seriesName) namesByShow.set(row.tvdbShowId, row.seriesName);

    let episodes = byShow.get(row.tvdbShowId);
    if (!episodes) {
      episodes = new Map();
      byShow.set(row.tvdbShowId, episodes);
    }

    const key = episodeIdentity(row);
    const bucket = episodes.get(key);
    if (bucket) bucket.push(row);
    else episodes.set(key, [row]);
  }

  const showIds = new Set([
    ...byShow.keys(),
    ...seriesById.keys(),
    ...favourites,
    ...forLater,
  ]);

  const groups: ShowImportGroup[] = [];

  for (const tvdbShowId of showIds) {
    const series = seriesById.get(tvdbShowId);
    const episodes =
      byShow.get(tvdbShowId) ?? new Map<string, TvTimeWatchRow[]>();
    const watches: PlannedWatch[] = [];

    for (const rows of episodes.values()) {
      // Earliest row is the first watch regardless of how the export
      // flagged it; the export contains duplicated first-watch rows.
      const ordered = [...rows].sort((a, b) =>
        a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
      );
      const firstDate = dateOf(ordered[0].createdAt);

      ordered.forEach((row, index) => {
        const rowDate = dateOf(row.createdAt);
        const isBackfill = rowDate === BACKFILL_DATE;
        const isCarriedOverRewatch = index > 0 && rowDate === firstDate;

        watches.push({
          seasonNumber: row.seasonNumber,
          episodeNumber: row.episodeNumber,
          tvdbEpisodeId: row.tvdbEpisodeId,
          createdAt: row.createdAt,
          watchedOn: isBackfill || isCarriedOverRewatch ? null : rowDate,
        });
      });
    }

    groups.push({
      tvdbShowId,
      seriesName:
        series?.seriesName || namesByShow.get(tvdbShowId) || tvdbShowId,
      watches,
      // A show reaching here without a user-series row still gets tracked;
      // treat it as followed with the other flags clear.
      isFollowed: series ? series.isFollowed : true,
      isArchived: series?.isArchived ?? false,
      isForLater: (series?.isForLater ?? false) || forLater.has(tvdbShowId),
      followedAt: series?.followedAt ?? null,
      isFavourite: favourites.has(tvdbShowId),
    });
  }

  return groups;
}

export type MergeableWatch = {
  seasonNumber: number;
  episodeNumber: number;
  createdAt: string;
  watchedOn: string | null;
};

// The merge is per episode, not per row: with N rows already in the database
// for an episode and M in the import, insert M - N. Counting rather than
// skipping wholesale is what keeps rewatch counts correct and makes a re-run
// a no-op instead of a doubling.
//
// distinctEpisodes is the post-merge count of distinct (season, episode)
// pairs in seasons >= 1 — what deriveShowStatus compares against TMDB's
// total. Season 0 counts toward neither side.
export function planEpisodeInserts(
  existing: { seasonNumber: number; episodeNumber: number }[],
  incoming: MergeableWatch[]
): { toInsert: MergeableWatch[]; skipped: number; distinctEpisodes: number } {
  const existingCounts = new Map<string, number>();
  for (const row of existing) {
    const key = `${row.seasonNumber}-${row.episodeNumber}`;
    existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
  }

  const grouped = new Map<string, MergeableWatch[]>();
  for (const watch of incoming) {
    const key = `${watch.seasonNumber}-${watch.episodeNumber}`;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(watch);
    else grouped.set(key, [watch]);
  }

  const toInsert: MergeableWatch[] = [];
  let skipped = 0;

  for (const [key, rows] of grouped) {
    const already = existingCounts.get(key) ?? 0;
    const ordered = [...rows].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
    );
    skipped += Math.min(already, ordered.length);
    toInsert.push(...ordered.slice(already));
  }

  let distinctEpisodes = 0;
  for (const key of new Set([...existingCounts.keys(), ...grouped.keys()])) {
    if (Number(key.split('-')[0]) >= 1) distinctEpisodes++;
  }

  return { toInsert, skipped, distinctEpisodes };
}

// Order matters: completed is checked before archived so a show that was
// finished and then archived reads as finished, not dropped.
export function deriveShowStatus(input: {
  isFollowed: boolean;
  isArchived: boolean;
  isForLater: boolean;
  distinctWatchedEpisodes: number;
  totalEpisodes: number;
}): ShowStatus {
  if (input.isForLater) return 'watch_later';

  if (
    input.totalEpisodes > 0 &&
    input.distinctWatchedEpisodes >= input.totalEpisodes
  ) {
    return 'completed';
  }

  if (input.isArchived) return 'dropped';
  if (!input.isFollowed) return 'dropped';

  return 'watching';
}
