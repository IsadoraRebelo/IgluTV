'use client';

import { strFromU8, unzipSync } from 'fflate';
import { useRef, useState } from 'react';

import { Button } from '@/components';

import {
  buildImportPlan,
  parseSpecialStatus,
  parseTrackingRecords,
  type ShowImportGroup,
} from '@/services/tv-time-import';

import type { ImportBatchResponse, ShowOutcome } from '@/types';

const TRACKING_FILE = 'tracking-prod-records-v2.csv';
const SPECIAL_STATUS_FILE = 'user_show_special_status.csv';
const CHUNK_ATTEMPTS = 3;
const MAX_SHOWS_PER_CHUNK = 10;
const MAX_EPISODES_PER_CHUNK = 400;

type Phase =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'running'; done: number; total: number; current: string }
  | { kind: 'paused'; done: number; total: number; message: string }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

function baseName(path: string): string {
  return path.split('/').pop() ?? path;
}

// Only these two files are decompressed. The archive also contains
// comments, notifications, IP addresses and access tokens; none of it is
// read, and nothing from the archive but the parsed watch data is uploaded.
function extractCsvs(bytes: Uint8Array): {
  tracking: string;
  specialStatus: string;
} {
  const files = unzipSync(bytes, {
    filter: (file) =>
      baseName(file.name) === TRACKING_FILE ||
      baseName(file.name) === SPECIAL_STATUS_FILE,
  });

  let tracking = '';
  let specialStatus = '';

  for (const [path, content] of Object.entries(files)) {
    // The archive carries __MACOSX/._ resource-fork twins of every file.
    if (path.includes('__MACOSX')) continue;
    if (baseName(path) === TRACKING_FILE) tracking = strFromU8(content);
    if (baseName(path) === SPECIAL_STATUS_FILE) {
      specialStatus = strFromU8(content);
    }
  }

  if (!tracking) {
    throw new Error(
      `That zip has no ${TRACKING_FILE}. Upload the archive TV Time emailed you, unmodified.`
    );
  }

  return { tracking, specialStatus };
}

// Chunk by episode count, not show count: resolving episode ids is what costs
// time, and one show in a real export has over 1,200 watches. A show bigger
// than the budget becomes its own chunk rather than being split, so a show is
// always imported as a unit.
function chunkGroups(groups: ShowImportGroup[]): ShowImportGroup[][] {
  const chunks: ShowImportGroup[][] = [];
  let current: ShowImportGroup[] = [];
  let episodes = 0;

  for (const group of groups) {
    if (
      current.length > 0 &&
      (current.length >= MAX_SHOWS_PER_CHUNK ||
        episodes + group.watches.length > MAX_EPISODES_PER_CHUNK)
    ) {
      chunks.push(current);
      current = [];
      episodes = 0;
    }

    current.push(group);
    episodes += group.watches.length;
  }

  if (current.length > 0) chunks.push(current);

  return chunks;
}

async function sendChunk(shows: ShowImportGroup[]): Promise<ShowOutcome[]> {
  let lastError = 'Request failed';

  for (let attempt = 1; attempt <= CHUNK_ATTEMPTS; attempt++) {
    try {
      const res = await fetch('/api/import/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shows }),
      });

      if (res.ok) {
        const body = (await res.json()) as ImportBatchResponse;
        return body.outcomes;
      }

      lastError = `Server responded ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Request failed';
    }

    if (attempt < CHUNK_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }

  throw new Error(lastError);
}

export function ImportView() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [outcomes, setOutcomes] = useState<ShowOutcome[]>([]);
  // Mirrors pending.current.groups for the report to read during render —
  // refs cannot be read during render, only from event handlers/effects.
  const [groups, setGroups] = useState<ShowImportGroup[]>([]);
  // Where to resume from if a chunk gives up. Held in a ref because Retry
  // reads it from an event handler, not from render.
  const pending = useRef<{
    groups: ShowImportGroup[];
    chunkIndex: number;
  } | null>(null);
  // Guards against a double-click on "Retry from here" starting two
  // concurrent loops from the same index — both would read the same
  // existing counts and both insert, producing real duplicate rows.
  const running = useRef(false);
  const [isRunning, setIsRunning] = useState(false);

  async function runFrom(groups: ShowImportGroup[], startChunkIndex: number) {
    if (running.current) return;
    running.current = true;
    setIsRunning(true);

    try {
      const chunks = chunkGroups(groups);
      const collected = startChunkIndex === 0 ? [] : [...outcomes];

      for (let i = startChunkIndex; i < chunks.length; i++) {
        const chunk = chunks[i];
        setPhase({
          kind: 'running',
          done: i,
          total: chunks.length,
          current: chunk[0]?.seriesName ?? '',
        });

        try {
          collected.push(...(await sendChunk(chunk)));
          setOutcomes([...collected]);
        } catch (err) {
          setOutcomes([...collected]);
          setPhase({
            kind: 'paused',
            done: i,
            total: chunks.length,
            message: err instanceof Error ? err.message : 'Request failed',
          });
          // Keep the plan around so Retry can resume from this chunk.
          pending.current = { groups, chunkIndex: i };
          return;
        }
      }

      setPhase({ kind: 'done' });
    } finally {
      running.current = false;
      setIsRunning(false);
    }
  }

  async function onFile(file: File) {
    setOutcomes([]);
    setPhase({ kind: 'reading' });

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { tracking, specialStatus } = extractCsvs(bytes);
      const records = parseTrackingRecords(tracking);
      const groups = buildImportPlan({
        watches: records.watches,
        series: records.series,
        specialStatus: specialStatus ? parseSpecialStatus(specialStatus) : [],
      });

      pending.current = { groups, chunkIndex: 0 };
      setGroups(groups);
      await runFrom(groups, 0);
    } catch (err) {
      setPhase({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not read that zip',
      });
    }
  }

  function retry() {
    const resume = pending.current;
    if (resume) void runFrom(resume.groups, resume.chunkIndex);
  }

  return (
    <div className="mx-auto mt-5 flex w-full max-w-2xl flex-col gap-5 px-4 pb-10 md:mt-10 md:gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-foreground text-xl font-semibold tracking-tight">
          Import from TV Time
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload the data export TV Time emailed you. Only your watch history
          and show statuses are read — the rest of the archive stays on your
          device.
        </p>
      </header>

      {(phase.kind === 'idle' || phase.kind === 'error') && (
        <label className="border-muted flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <span className="text-foreground text-sm font-medium">
            Choose your tv-time-data.zip
          </span>
          <span className="text-muted-foreground text-xs">
            Nothing is uploaded until you pick a file
          </span>
          <input
            type="file"
            accept=".zip,application/zip"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
      )}

      {phase.kind === 'error' && (
        <p className="text-dropped text-sm">{phase.message}</p>
      )}

      {phase.kind === 'reading' && (
        <p className="text-muted-foreground text-sm">Reading the archive…</p>
      )}

      {phase.kind === 'running' && (
        <ProgressPanel
          done={phase.done}
          total={phase.total}
          label={`Importing ${phase.current}…`}
          outcomes={outcomes}
        />
      )}

      {phase.kind === 'paused' && (
        <div className="flex flex-col gap-3">
          <ProgressPanel
            done={phase.done}
            total={phase.total}
            label={`Stopped: ${phase.message}`}
            outcomes={outcomes}
          />
          <Button variant="primary" onClick={retry} disabled={isRunning}>
            Retry from here
          </Button>
        </div>
      )}

      {(phase.kind === 'done' || phase.kind === 'paused') && (
        <ImportReport outcomes={outcomes} groups={groups} />
      )}
    </div>
  );
}

function ProgressPanel({
  done,
  total,
  label,
  outcomes,
}: {
  done: number;
  total: number;
  label: string;
  outcomes: ShowOutcome[];
}) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const inserted = outcomes.reduce(
    (sum, outcome) => sum + (outcome.ok ? outcome.inserted : 0),
    0
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-foreground h-full transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-muted-foreground text-sm">
        {label} — batch {done} of {total}, {inserted} episode watches written
      </p>
    </div>
  );
}

// A rewatch is any watch beyond the first for its episode identity within a
// show's group — the same identity rule buildImportPlan uses: the TVDB
// episode id, falling back to season+episode when the export has no id.
function countRewatches(group: ShowImportGroup): number {
  const buckets = new Map<string, number>();

  for (const watch of group.watches) {
    const key =
      watch.tvdbEpisodeId || `${watch.seasonNumber}-${watch.episodeNumber}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  let rewatches = 0;
  for (const count of buckets.values()) rewatches += count - 1;
  return rewatches;
}

function ImportReport({
  outcomes,
  groups,
}: {
  outcomes: ShowOutcome[];
  groups: ShowImportGroup[];
}) {
  const succeeded = outcomes.filter((o) => o.ok === true);
  const inserted = succeeded.reduce((sum, o) => sum + o.inserted, 0);
  const skipped = succeeded.reduce((sum, o) => sum + o.skipped, 0);
  const matchedByName = succeeded.filter((o) => o.matchedByName);
  const withUnresolved = succeeded.filter(
    (o) => o.unresolvedEpisodes.length > 0
  );
  const withUnverified = succeeded.filter((o) => o.unverifiedEpisodes > 0);
  const trackingUntouched = succeeded.filter((o) => !o.trackingInserted);
  const failed = outcomes.filter((o) => o.ok === false);

  const groupsByShowId = new Map(groups.map((g) => [g.tvdbShowId, g]));
  const rewatches = succeeded.reduce((sum, o) => {
    const group = groupsByShowId.get(o.tvdbShowId);
    return sum + (group ? countRewatches(group) : 0);
  }, 0);

  const text = [
    `Imported: ${succeeded.length} shows, ${inserted} episode watches, ${rewatches} rewatches in the imported data (not necessarily newly written)`,
    `Already there, skipped: ${skipped}`,
    `Existing tracking left untouched: ${trackingUntouched.length}`,
    '',
    'Shows not imported:',
    ...failed.map(
      (o) =>
        `  ${o.seriesName || o.tvdbShowId} (TV Time ${o.tvdbShowId}) — ${o.episodeCount} episodes — ${o.reason === 'show_unmatched' ? 'no TMDB match' : o.message}`
    ),
    '',
    'Shows matched by name:',
    ...matchedByName.map(
      (o) => `  ${o.seriesName} → ${o.tmdbName} (TMDB ${o.tmdbShowId})`
    ),
    '',
    'Episodes placed by TV Time numbering (not verified by id):',
    ...withUnverified.map(
      (o) => `  ${o.seriesName}: ${o.unverifiedEpisodes} watches`
    ),
    '',
    'Episodes not imported:',
    ...withUnresolved.map(
      (o) =>
        `  ${o.seriesName}: ${o.unresolvedEpisodes.map((e) => `S${e.seasonNumber}E${e.episodeNumber} (${e.tvdbEpisodeId})`).join(', ')}`
    ),
  ].join('\n');

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-foreground text-lg font-semibold">Import report</h2>

      <p className="text-foreground text-sm">
        Imported <strong>{succeeded.length}</strong> shows and{' '}
        <strong>{inserted}</strong> episode watches, including{' '}
        <strong>{rewatches}</strong> rewatches in the imported data.{' '}
        <span className="text-muted-foreground">
          (This counts rewatches present in your TV Time history, not
          necessarily rows newly written — some may already have existed.){' '}
          {skipped} already existed and were left alone.{' '}
          {trackingUntouched.length} shows already had tracking, which was left
          untouched.
        </span>
      </p>

      <ReportList
        title={`Shows not imported (${failed.length})`}
        empty="Every show matched."
        items={failed.map((o) => ({
          key: o.tvdbShowId,
          text: `${o.seriesName || o.tvdbShowId} — ${o.episodeCount} episodes — ${
            o.reason === 'show_unmatched' ? 'no TMDB match' : o.message
          }`,
        }))}
      />

      <ReportList
        title={`Shows matched by name (${matchedByName.length})`}
        empty="None — every show matched on its id."
        items={matchedByName.map((o) => ({
          key: o.tvdbShowId,
          text: `${o.seriesName} → ${o.tmdbName}`,
        }))}
      />

      <ReportList
        title={`Episodes placed by TV Time numbering (${withUnverified.length})`}
        empty="Every episode was matched by id."
        items={withUnverified.map((o) => ({
          key: o.tvdbShowId,
          text: `${o.seriesName}: ${o.unverifiedEpisodes} watches`,
        }))}
      />

      <ReportList
        title={`Episodes not imported (${withUnresolved.reduce((n, o) => n + o.unresolvedEpisodes.length, 0)})`}
        empty="Every episode resolved."
        items={withUnresolved.map((o) => ({
          key: o.tvdbShowId,
          text: `${o.seriesName}: ${o.unresolvedEpisodes
            .map(
              (e) =>
                `S${e.seasonNumber}E${e.episodeNumber} (${e.tvdbEpisodeId})`
            )
            .join(', ')}`,
        }))}
      />

      <Button
        variant="primary"
        onClick={() => void navigator.clipboard.writeText(text)}
      >
        Copy report
      </Button>
    </section>
  );
}

function ReportList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { key: string; text: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-foreground text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
          {items.map((item) => (
            <li key={item.key}>{item.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
