'use client';

import { ChevronRight, RotateCcw } from 'lucide-react';
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
  return entry.show.name;
}

function diaryRowMeta(entry: DiaryEntry): string {
  const parts: string[] = [];
  parts.push(
    entry.kind === 'season' ? `Season ${entry.seasonNumber}` : 'Completed'
  );
  if (entry.show.genres[0]) parts.push(entry.show.genres[0]);
  return parts.join(' · ');
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
    width: 140,
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
    width: 110,
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
    <div className="flex flex-col gap-3 md:gap-5">
      <ListFilterBar
        title="Diary"
        facets={controls.facets}
        sortKey={controls.sortKey}
        sortDirection={controls.sortDirection}
        sortLabels={controls.sortLabels}
        onSortChange={controls.onSortChange}
        controlsRowClassName="flex flex-wrap items-center gap-2"
        desktopFacetsClassName="hidden flex-wrap items-center gap-3 sm:flex"
      />

      {controls.hasNoMatches ? (
        <EmptyState message="No entries match these filters." />
      ) : (
        <div className="flex flex-col">
          {controls.pageEntries.map(({ entry, showMonthBadge, showDay }) => {
            const current = formatDiaryDate(entry.watchedOn);
            return (
              <div key={diaryEntryKey(entry)}>
                {showMonthBadge ? (
                  <div className="flex items-center gap-2.5 md:gap-3 sm:pb-2">
                    <span className="text-accent text-[11px] font-bold tracking-widest sm:text-xs">
                      {current.month} {current.year}
                    </span>
                    <span className="h-px flex-1 bg-white/[0.08]" />
                  </div>
                ) : null}
                <Link
                  href={`/show/${entry.show.id}`}
                  className="flex items-center gap-3 rounded-lg border-b border-white/5 px-0.5 py-2.5 hover:bg-white/[0.03] sm:gap-4 sm:px-2 sm:py-3"
                >
                  <div className="w-[30px] shrink-0 text-center sm:w-10">
                    <div className="font-heading text-[19px] leading-none font-extrabold text-white sm:text-2xl">
                      {showDay ? current.day : ''}
                    </div>
                    <div className="text-text-faint mt-1 text-[8.5px] font-semibold tracking-widest sm:text-[9px]">
                      {showDay ? current.dayOfWeek : ''}
                    </div>
                  </div>

                  <div className="bg-surface relative aspect-[2/3] w-[38px] shrink-0 overflow-hidden rounded-md sm:w-11">
                    {entry.show.posterUrl ? (
                      <Image
                        src={entry.show.posterUrl}
                        alt={entry.show.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : null}
                    {entry.rewatch ? (
                      <div className="bg-accent text-background absolute right-[3px] bottom-[3px] flex h-[15px] w-[15px] items-center justify-center rounded-full shadow-sm sm:hidden">
                        <RotateCcw className="h-[9px] w-[9px]" />
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white sm:text-[15px]">
                      {diaryRowLabel(entry)}
                    </div>
                    <div className="text-text-secondary mt-0.5 truncate text-[11px] sm:text-xs">
                      {diaryRowMeta(entry)}
                    </div>
                  </div>

                  {entry.rewatch ? (
                    <span className="text-accent bg-accent/10 hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold sm:inline-flex">
                      <RotateCcw className="h-2.5 w-2.5" />
                      Rewatch
                    </span>
                  ) : null}

                  <div className="text-text-faint hidden w-[88px] shrink-0 text-right text-xs sm:block">
                    {entry.show.year ? `Released ${entry.show.year}` : null}
                  </div>

                  <ChevronRight className="text-text-faint h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                </Link>
              </div>
            );
          })}
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
