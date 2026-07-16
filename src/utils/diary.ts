import type { ShowSummary } from '@/types';

export type DiaryEntry =
  | { kind: 'show'; show: ShowSummary; watchedOn: string }
  | {
      kind: 'season';
      show: ShowSummary;
      seasonNumber: number;
      watchedOn: string;
    };

export type DiaryDayGroup = { day: string; entries: DiaryEntry[] };
export type DiaryMonthGroup = {
  key: string;
  month: string;
  days: DiaryDayGroup[];
};

export function formatDiaryDate(dateStr: string): {
  month: string;
  day: string;
  year: string;
} {
  const date = new Date(`${dateStr}T00:00:00`);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
    year: String(date.getFullYear()),
  };
}

export function diaryEntryLabel(entry: DiaryEntry): string {
  return entry.kind === 'season'
    ? `S${entry.seasonNumber} · ${entry.show.name}`
    : entry.show.name;
}

export function diaryEntryKey(entry: DiaryEntry): string {
  return entry.kind === 'season'
    ? `${entry.show.id}-s${entry.seasonNumber}`
    : `${entry.show.id}-show`;
}

export function buildDiaryEntries(
  finishedShowRows: { tmdbShowId: number; watchedOn: string }[],
  finishedSeasonRows: {
    tmdbShowId: number;
    seasonNumber: number;
    watchedOn: string;
  }[],
  summaries: Map<number, ShowSummary>
): DiaryEntry[] {
  const showEntries = finishedShowRows
    .map((row): DiaryEntry | null => {
      const show = summaries.get(row.tmdbShowId);
      if (!show) return null;
      return { kind: 'show', show, watchedOn: row.watchedOn };
    })
    .filter((entry): entry is DiaryEntry => entry !== null);

  const seasonEntries = finishedSeasonRows
    .map((row): DiaryEntry | null => {
      const show = summaries.get(row.tmdbShowId);
      if (!show) return null;
      return {
        kind: 'season',
        show,
        seasonNumber: row.seasonNumber,
        watchedOn: row.watchedOn,
      };
    })
    .filter((entry): entry is DiaryEntry => entry !== null);

  return [...showEntries, ...seasonEntries].sort((a, b) =>
    a.watchedOn < b.watchedOn ? 1 : a.watchedOn > b.watchedOn ? -1 : 0
  );
}

export function groupDiaryEntriesByMonth(
  entries: DiaryEntry[]
): DiaryMonthGroup[] {
  const groups: DiaryMonthGroup[] = [];

  for (const entry of entries) {
    const { month, day } = formatDiaryDate(entry.watchedOn);
    const date = new Date(`${entry.watchedOn}T00:00:00`);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

    let monthGroup = groups[groups.length - 1];
    if (!monthGroup || monthGroup.key !== monthKey) {
      monthGroup = { key: monthKey, month, days: [] };
      groups.push(monthGroup);
    }

    let dayGroup = monthGroup.days[monthGroup.days.length - 1];
    if (!dayGroup || dayGroup.day !== day) {
      dayGroup = { day, entries: [] };
      monthGroup.days.push(dayGroup);
    }
    dayGroup.entries.push(entry);
  }

  return groups;
}
