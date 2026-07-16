'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Pagination } from '@/components/Pagination/Pagination';

import { type DiaryEntry, diaryEntryKey, formatDiaryDate } from '@/utils';

import { DiaryFilterBar } from './DiaryFilterBar';
import type { DiarySortDirection, DiarySortKey } from './types';

const PAGE_SIZE = 30;

const SORT_DEFAULT_DIRECTION: Record<DiarySortKey, DiarySortDirection> = {
  'watched-date': 'desc',
  'release-date': 'desc',
  alphabetical: 'asc',
};

function decadeOf(entry: DiaryEntry): number | null {
  return entry.show.year ? Math.floor(Number(entry.show.year) / 10) * 10 : null;
}

function diaryRowLabel(entry: DiaryEntry): string {
  return entry.kind === 'season'
    ? `${entry.show.name} — Season ${entry.seasonNumber}`
    : entry.show.name;
}

function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function sortEntries(
  entries: DiaryEntry[],
  sortKey: DiarySortKey,
  direction: DiarySortDirection
): DiaryEntry[] {
  if (sortKey === 'release-date') {
    const withYear = entries.filter((e) => e.show.year !== null);
    const withoutYear = entries.filter((e) => e.show.year === null);
    withYear.sort((a, b) => a.show.year!.localeCompare(b.show.year!));
    if (direction === 'desc') withYear.reverse();
    return [...withYear, ...withoutYear];
  }

  const sorted = [...entries].sort((a, b) => {
    switch (sortKey) {
      case 'watched-date':
        return a.watchedOn.localeCompare(b.watchedOn);
      case 'alphabetical':
        return a.show.name.localeCompare(b.show.name);
    }
  });

  if (direction === 'desc') sorted.reverse();
  return sorted;
}

export function DiaryPageView({ entries }: { entries: DiaryEntry[] }) {
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [selectedDecades, setSelectedDecades] = useState<Set<number>>(
    new Set()
  );
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<DiarySortKey>('watched-date');
  const [sortDirection, setSortDirection] = useState<DiarySortDirection>(
    SORT_DEFAULT_DIRECTION['watched-date']
  );
  const [page, setPage] = useState(1);

  const yearOptions = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => Number(formatDiaryDate(e.watchedOn).year)))
      ).sort((a, b) => b - a),
    [entries]
  );
  const decadeOptions = useMemo(
    () =>
      Array.from(
        new Set(entries.map(decadeOf).filter((d): d is number => d !== null))
      ).sort((a, b) => b - a),
    [entries]
  );
  const genreOptions = useMemo(
    () =>
      Array.from(new Set(entries.flatMap((e) => e.show.genres))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (
        selectedYears.size > 0 &&
        !selectedYears.has(Number(formatDiaryDate(entry.watchedOn).year))
      ) {
        return false;
      }
      const decade = decadeOf(entry);
      if (
        selectedDecades.size > 0 &&
        (decade === null || !selectedDecades.has(decade))
      ) {
        return false;
      }
      if (
        selectedGenres.size > 0 &&
        !entry.show.genres.some((genre) => selectedGenres.has(genre))
      ) {
        return false;
      }
      return true;
    });
  }, [entries, selectedYears, selectedDecades, selectedGenres]);

  const sortedEntries = useMemo(
    () => sortEntries(filteredEntries, sortKey, sortDirection),
    [filteredEntries, sortKey, sortDirection]
  );

  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageEntries = sortedEntries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function resetToFirstPage() {
    setPage(1);
  }

  function handleSortChange(key: DiarySortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(SORT_DEFAULT_DIRECTION[key]);
    }
    resetToFirstPage();
  }

  if (entries.length === 0) {
    return (
      <p className="py-24 text-center text-[#9ab0bf]">No diary entries yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
        Diary
      </h1>

      <DiaryFilterBar
        yearOptions={yearOptions}
        decadeOptions={decadeOptions}
        genreOptions={genreOptions}
        selectedYears={selectedYears}
        selectedDecades={selectedDecades}
        selectedGenres={selectedGenres}
        onToggleYear={(value) => {
          setSelectedYears((s) => toggleSetValue(s, value));
          resetToFirstPage();
        }}
        onToggleDecade={(value) => {
          setSelectedDecades((s) => toggleSetValue(s, value));
          resetToFirstPage();
        }}
        onToggleGenre={(value) => {
          setSelectedGenres((s) => toggleSetValue(s, value));
          resetToFirstPage();
        }}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      {pageEntries.length === 0 ? (
        <p className="py-24 text-center text-[#9ab0bf]">
          No entries match these filters.
        </p>
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
              {pageEntries.map((entry, i) => {
                const prev = i > 0 ? pageEntries[i - 1] : null;
                const current = formatDiaryDate(entry.watchedOn);
                const prevFormatted = prev
                  ? formatDiaryDate(prev.watchedOn)
                  : null;
                const showMonthBadge =
                  !prevFormatted ||
                  prevFormatted.month !== current.month ||
                  prevFormatted.year !== current.year;
                const showDay = !prev || prev.watchedOn !== entry.watchedOn;

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
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
