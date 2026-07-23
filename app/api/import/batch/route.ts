import {
  type CatalogueRow,
  upsertCatalogueShows,
} from '@/services/show-catalogue';
import {
  deriveShowStatus,
  type PlannedWatch,
  type ShowImportGroup,
} from '@/services/tv-time-import';
import {
  getSeasonStructure,
  resolveEpisodeNumber,
  resolveShow,
  type SeasonStructure,
} from '@/services/tv-time-resolve';
import {
  insertShowTrackingIfAbsent,
  mergeEpisodeWatches,
  type ResolvedWatch,
} from '@/services/tv-time-write';
import { requireViewer } from '@/services/viewer';

import type {
  ImportBatchRequest,
  ImportBatchResponse,
  ShowOutcome,
  UnresolvedEpisode,
} from '@/types';

// Episode-id resolution dominates this route: one chunk can issue well over a
// thousand TMDB lookups. The default ceiling is not enough headroom.
export const maxDuration = 300;

const MAX_SHOWS_PER_REQUEST = 25;
const EPISODE_LOOKUP_CONCURRENCY = 10;

type PlacedEpisodes = {
  watches: ResolvedWatch[];
  unresolved: UnresolvedEpisode[];
  unverified: number;
};

// The TVDB episode id is the only trustworthy identity. TV Time's season and
// episode numbers agree with TMDB often enough to look safe and disagree
// often enough to be dangerous: TMDB's Bleach season 2 is Thousand-Year Blood
// War (2022) while TV Time's season 2 is episodes 21-41 of the original run,
// so a structural "TMDB has a season 2 that long, accept it" check files 21
// episodes under a series the user never watched.
//
// But only ~84% of TVDB episode ids resolve against TMDB, so the numbers
// cannot be abandoned either — dropping them would lose thousands of
// episodes. Ids win where they exist; the numbers are a counted, reported
// fallback where they do not.
async function placeEpisodes(
  group: ShowImportGroup,
  structure: SeasonStructure,
  tmdbShowId: number
): Promise<PlacedEpisodes> {
  const uniqueIds = [
    ...new Set(group.watches.map((w) => w.tvdbEpisodeId).filter(Boolean)),
  ];

  const byId = new Map<
    string,
    { seasonNumber: number; episodeNumber: number } | null
  >();

  // Batched rather than sequential: Bleach alone needs 365 lookups, which
  // back-to-back is a two-minute freeze on one chunk.
  for (let i = 0; i < uniqueIds.length; i += EPISODE_LOOKUP_CONCURRENCY) {
    const slice = uniqueIds.slice(i, i + EPISODE_LOOKUP_CONCURRENCY);
    const results = await Promise.all(
      slice.map((id) => resolveEpisodeNumber(id, tmdbShowId))
    );
    slice.forEach((id, n) => byId.set(id, results[n]));
  }

  const watches: ResolvedWatch[] = [];
  const unresolved: UnresolvedEpisode[] = [];
  let unverified = 0;

  for (const watch of group.watches) {
    const resolved = watch.tvdbEpisodeId
      ? (byId.get(watch.tvdbEpisodeId) ?? null)
      : null;

    if (resolved) {
      watches.push(
        toResolvedWatch(watch, resolved.seasonNumber, resolved.episodeNumber)
      );
      continue;
    }

    // No id mapping. Fall back to TV Time's own numbers when they at least
    // fit TMDB's shape. episodeNumber >= 1 matters: TV Time writes 0 for
    // episodes it could not number, and 0 <= count would otherwise pass.
    const known = structure.episodeCounts.get(watch.seasonNumber);
    if (
      known !== undefined &&
      watch.episodeNumber >= 1 &&
      watch.episodeNumber <= known
    ) {
      unverified++;
      watches.push(
        toResolvedWatch(watch, watch.seasonNumber, watch.episodeNumber)
      );
      continue;
    }

    unresolved.push({
      seasonNumber: watch.seasonNumber,
      episodeNumber: watch.episodeNumber,
      tvdbEpisodeId: watch.tvdbEpisodeId,
    });
  }

  return { watches, unresolved, unverified };
}

async function importShow(
  userId: string,
  group: ShowImportGroup,
  catalogueRows: CatalogueRow[]
): Promise<ShowOutcome> {
  const resolved = await resolveShow(group.tvdbShowId, group.seriesName);

  if (!resolved) {
    return {
      ok: false,
      tvdbShowId: group.tvdbShowId,
      seriesName: group.seriesName,
      reason: 'show_unmatched',
      message: null,
      episodeCount: group.watches.length,
    };
  }

  const structure = await getSeasonStructure(resolved.tmdbShowId);
  if (structure.catalogueRow) catalogueRows.push(structure.catalogueRow);
  const placed = await placeEpisodes(group, structure, resolved.tmdbShowId);

  const merged = await mergeEpisodeWatches(
    userId,
    resolved.tmdbShowId,
    placed.watches
  );

  const status = deriveShowStatus({
    isFollowed: group.isFollowed,
    isArchived: group.isArchived,
    isForLater: group.isForLater,
    distinctWatchedEpisodes: merged.distinctEpisodes,
    totalEpisodes: structure.totalEpisodes,
  });

  const tracking = await insertShowTrackingIfAbsent({
    userId,
    tmdbShowId: resolved.tmdbShowId,
    status,
    isFavourite: group.isFavourite,
    createdAt: group.followedAt,
  });

  return {
    ok: true,
    tvdbShowId: group.tvdbShowId,
    seriesName: group.seriesName,
    tmdbShowId: resolved.tmdbShowId,
    tmdbName: resolved.tmdbName,
    matchedByName: resolved.matchedByName,
    status,
    inserted: merged.inserted,
    skipped: merged.skipped,
    unresolvedEpisodes: placed.unresolved,
    unverifiedEpisodes: placed.unverified,
    trackingInserted: tracking.inserted,
  };
}

function toResolvedWatch(
  watch: PlannedWatch,
  seasonNumber: number,
  episodeNumber: number
): ResolvedWatch {
  return {
    seasonNumber,
    episodeNumber,
    createdAt: watch.createdAt,
    watchedOn: watch.watchedOn,
  };
}

export async function POST(request: Request) {
  let viewer;
  try {
    viewer = await requireViewer();
  } catch {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: ImportBatchRequest;
  try {
    body = (await request.json()) as ImportBatchRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const shows = body?.shows;
  if (!Array.isArray(shows)) {
    return Response.json({ error: 'shows must be an array' }, { status: 400 });
  }
  if (shows.length > MAX_SHOWS_PER_REQUEST) {
    return Response.json(
      { error: `At most ${MAX_SHOWS_PER_REQUEST} shows per request` },
      { status: 400 }
    );
  }

  const outcomes: ShowOutcome[] = [];
  const catalogueRows: CatalogueRow[] = [];

  for (const group of shows) {
    try {
      outcomes.push(await importShow(viewer.id, group, catalogueRows));
    } catch (err) {
      outcomes.push({
        ok: false,
        tvdbShowId: group?.tvdbShowId ?? '',
        seriesName: group?.seriesName ?? '',
        reason: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
        episodeCount: group?.watches?.length ?? 0,
      });
    }
  }

  await upsertCatalogueShows(catalogueRows);

  const response: ImportBatchResponse = { outcomes };
  return Response.json(response);
}
