'use client';

import Image from 'next/image';
import Link from 'next/link';

import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ListFilterBar } from '@/components/ListFilterBar/ListFilterBar';
import { Pagination } from '@/components/Pagination/Pagination';

import type { FacetDef, SortKeyDef } from '@/types/list-controls';

import {
  type DiaryEntry,
  diaryEntryKey,
  type DiaryMonthGroup,
  formatDiaryDate,
  groupDiaryEntriesByMonth,
} from '@/utils';
import { useListControls } from '@/hooks/useListControls';

type DiarySortKey = 'watched-date' | 'release-date' | 'alphabetical';

const PAGE_SIZE = 30;

function decadeOf(entry: DiaryEntry): number | null {
  return entry.show.year ? Math.floor(Number(entry.show.year) / 10) * 10 : null;
}

function diaryYearOf(entry: DiaryEntry): number {
  return Number(formatDiaryDate(entry.watchedOn).year);
}

function diaryRowLabel(entry: DiaryEntry): string {
  return entry.kind === 'season'
    ? `${entry.show.name} — Season ${entry.seasonNumber}`
    : entry.show.name;
}

type DiaryRow = {
  entry: DiaryEntry;
  showMonthBadge: boolean;
  showDay: boolean;
};

// Flattens the month/day groups back into a single ordered row list,
// tagging each row with whether it starts a new month (badge) or a new
// day (date value). Running this over the FULL sorted list (before
// pagination) — rather than comparing each page's rows only to their
// immediate neighbor within that same page — is what fixes the bug where
// an entry landing on the first row of page 2 always showed its month
// badge, even if it shared a month with page 1's last row.
function flattenDiaryGroups(groups: DiaryMonthGroup[]): DiaryRow[] {
  const rows: DiaryRow[] = [];
  for (const monthGroup of groups) {
    monthGroup.days.forEach((dayGroup, dayIndex) => {
      dayGroup.entries.forEach((entry, entryIndex) => {
        rows.push({
          entry,
          showMonthBadge: dayIndex === 0 && entryIndex === 0,
          showDay: entryIndex === 0,
        });
      });
    });
  }
  return rows;
}

const FACETS: FacetDef<DiaryEntry>[] = [
  {
    key: 'year',
    label: 'Diary Year',
    getOptions: (entries) =>
      Array.from(new Set(entries.map(diaryYearOf))).sort((a, b) => b - a),
    getValues: (entry) => [diaryYearOf(entry)],
    optionLabel: (value) => String(value),
  },
  {
    key: 'decade',
    label: 'Decade',
    getOptions: (entries) =>
      Array.from(
        new Set(entries.map(decadeOf).filter((d): d is number => d !== null))
      ).sort((a, b) => b - a),
    getValues: (entry) => {
      const decade = decadeOf(entry);
      return decade === null ? [] : [decade];
    },
    optionLabel: (value) => `${value}s`,
  },
  {
    key: 'genre',
    label: 'Genre',
    getOptions: (entries) =>
      Array.from(new Set(entries.flatMap((e) => e.show.genres))).sort((a, b) =>
        a.localeCompare(b)
      ),
    getValues: (entry) => entry.show.genres,
    optionLabel: (value) => String(value),
  },
];

const SORT_KEYS: SortKeyDef<DiaryEntry, DiarySortKey>[] = [
  {
    key: 'watched-date',
    label: 'Watched Date',
    defaultDirection: 'desc',
    strategy: {
      kind: 'comparator',
      compare: (a, b) => a.watchedOn.localeCompare(b.watchedOn),
    },
  },
  {
    key: 'release-date',
    label: 'Release Date',
    defaultDirection: 'desc',
    strategy: { kind: 'nullable-string', getValue: (e) => e.show.year },
  },
  {
    key: 'alphabetical',
    label: 'Alphabetical',
    defaultDirection: 'asc',
    strategy: {
      kind: 'comparator',
      compare: (a, b) => a.show.name.localeCompare(b.show.name),
    },
  },
];

export function DiaryPageView({ entries }: { entries: DiaryEntry[] }) {
  const controls = useListControls<DiaryEntry, DiarySortKey, DiaryRow>({
    entries,
    facets: FACETS,
    sortKeys: SORT_KEYS,
    initialSortKey: 'watched-date',
    pageSize: PAGE_SIZE,
    postProcess: (sorted) =>
      flattenDiaryGroups(groupDiaryEntriesByMonth(sorted)),
  });

  if (controls.isEmpty) {
    return <EmptyState message="No diary entries yet." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <ListFilterBar
        title="Diary"
        facets={controls.facets}
        sortKey={controls.sortKey}
        sortDirection={controls.sortDirection}
        sortLabels={controls.sortLabels}
        onSortChange={controls.onSortChange}
        controlsRowClassName="flex flex-wrap items-center gap-4"
        desktopFacetsClassName="hidden flex-wrap items-center gap-5 sm:flex"
        sortDropdownWrapperClassName="hidden sm:block"
      />

      {controls.hasNoMatches ? (
        <EmptyState message="No entries match these filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-muted-foreground border-b border-white/10 text-left text-[10px] font-semibold tracking-wide uppercase">
                <th className="py-2 pr-3 font-semibold">Month</th>
                <th className="py-2 pr-3 font-semibold">Day</th>
                <th className="py-2 pr-3 font-semibold">Film</th>
                <th className="hidden py-2 pr-3 font-semibold sm:table-cell">
                  Released
                </th>
              </tr>
            </thead>
            <tbody>
              {controls.pageEntries.map(
                ({ entry, showMonthBadge, showDay }) => {
                  const current = formatDiaryDate(entry.watchedOn);
                  return (
                    <tr
                      key={diaryEntryKey(entry)}
                      className="border-b border-white/5 hover:bg-white/[0.03]"
                    >
                      <td className="py-3 pr-3 align-top">
                        {showMonthBadge ? (
                          <div className="flex w-14 flex-col items-center rounded-md bg-white/[0.06] py-1">
                            <span className="text-[10px] font-bold tracking-wide text-[#8a9bab] uppercase">
                              {current.month}
                            </span>
                            <span className="text-[10px] font-bold tracking-wide text-[#8a9bab] uppercase">
                              {current.year}
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td className="text-accent-foreground py-3 pr-3 align-top text-sm">
                        {showDay ? current.day : null}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <Link
                          href={`/show/${entry.show.id}`}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-md bg-[#2c3440]">
                            {entry.show.posterUrl ? (
                              <Image
                                src={entry.show.posterUrl}
                                alt={entry.show.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                          <span className="truncate text-sm font-semibold text-white">
                            {diaryRowLabel(entry)}
                          </span>
                        </Link>
                      </td>
                      <td className="text-muted-foreground hidden py-3 pr-3 align-top text-sm sm:table-cell">
                        {entry.show.year ?? '—'}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={controls.page}
        totalPages={controls.totalPages}
        onPageChange={controls.onPageChange}
      />
    </div>
  );
}
