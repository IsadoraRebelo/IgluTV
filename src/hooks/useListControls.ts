'use client';

import { useMemo, useState } from 'react';

import type {
  Density,
  DensityConfig,
  FacetDef,
  FacetState,
  FacetValue,
  SortDirection,
  SortKeyDef,
} from '@/types/list-controls';

function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function isDensityConfig(
  pageSize: number | DensityConfig | 'all'
): pageSize is DensityConfig {
  return typeof pageSize === 'object';
}

export function useListControls<
  TEntry,
  TSortKey extends string,
  TOutput = TEntry,
>({
  entries,
  facets,
  sortKeys,
  initialSortKey,
  pageSize,
  postProcess,
}: {
  entries: TEntry[];
  facets: FacetDef<TEntry>[];
  sortKeys: SortKeyDef<TEntry, TSortKey>[];
  initialSortKey: TSortKey;
  // A plain number is a fixed page size (Watchlist, Diary). A
  // `DensityConfig` picks the page size from the current density
  // (WatchedShows, the only family with a density toggle). `'all'` means
  // no pagination at all (CastPage never paginates).
  pageSize: number | DensityConfig | 'all';
  // Runs once, after filtering+sorting but before pagination, letting a
  // family reshape TEntry[] into a different paginated output shape.
  // Diary uses this to turn DiaryEntry[] into flagged table rows.
  postProcess?: (sortedEntries: TEntry[]) => TOutput[];
}) {
  const sortKeyDefs = useMemo(
    () => new Map(sortKeys.map((def) => [def.key, def])),
    [sortKeys]
  );
  const sortLabels = useMemo(
    () =>
      Object.fromEntries(sortKeys.map((def) => [def.key, def.label])) as Record<
        TSortKey,
        string
      >,
    [sortKeys]
  );

  const [selectedByFacet, setSelectedByFacet] = useState<
    Map<string, Set<FacetValue>>
  >(() => new Map(facets.map((facet) => [facet.key, new Set<FacetValue>()])));
  const [sortKey, setSortKey] = useState<TSortKey>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    sortKeyDefs.get(initialSortKey)!.defaultDirection
  );
  const densityConfig = isDensityConfig(pageSize) ? pageSize : null;
  const [density, setDensity] = useState<Density | null>(
    densityConfig?.initial ?? null
  );
  const [page, setPage] = useState(1);

  function resetToFirstPage() {
    setPage(1);
  }

  const facetOptions = useMemo(
    () =>
      new Map(facets.map((facet) => [facet.key, facet.getOptions(entries)])),
    [facets, entries]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) =>
      facets.every((facet) => {
        const selected = selectedByFacet.get(facet.key);
        if (!selected || selected.size === 0) return true;
        const values = facet.getValues(entry);
        return values.some((value) => selected.has(value));
      })
    );
  }, [entries, facets, selectedByFacet]);

  const sortedEntries = useMemo(() => {
    const def = sortKeyDefs.get(sortKey);
    if (!def) return filteredEntries;
    const { strategy } = def;
    if (strategy.kind === 'nullable-string') {
      const withValue = filteredEntries.filter(
        (e) => strategy.getValue(e) !== null
      );
      const withoutValue = filteredEntries.filter(
        (e) => strategy.getValue(e) === null
      );
      withValue.sort((a, b) =>
        strategy.getValue(a)!.localeCompare(strategy.getValue(b)!)
      );
      if (sortDirection === 'desc') withValue.reverse();
      return [...withValue, ...withoutValue];
    }
    const sorted = [...filteredEntries].sort(strategy.compare);
    if (sortDirection === 'desc') sorted.reverse();
    return sorted;
  }, [filteredEntries, sortKeyDefs, sortKey, sortDirection]);

  const processedEntries = useMemo(
    () =>
      postProcess
        ? postProcess(sortedEntries)
        : (sortedEntries as unknown as TOutput[]),
    [sortedEntries, postProcess]
  );

  const effectivePageSize =
    pageSize === 'all'
      ? Math.max(processedEntries.length, 1)
      : densityConfig
        ? densityConfig.pageSizeByDensity[density ?? densityConfig.initial]
        : (pageSize as number);

  const totalPages = Math.max(
    1,
    Math.ceil(processedEntries.length / effectivePageSize)
  );
  const currentPage = Math.min(page, totalPages);
  const pageEntries = processedEntries.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize
  );

  const facetState: FacetState[] = facets.map((facet) => ({
    key: facet.key,
    label: facet.label,
    options: facetOptions.get(facet.key) ?? [],
    optionLabel: facet.optionLabel,
    width: facet.width,
    selected: selectedByFacet.get(facet.key) ?? new Set<FacetValue>(),
    onToggle: (value: FacetValue) => {
      setSelectedByFacet((prev) => {
        const next = new Map(prev);
        next.set(
          facet.key,
          toggleSetValue(next.get(facet.key) ?? new Set<FacetValue>(), value)
        );
        return next;
      });
      resetToFirstPage();
    },
  }));

  function handleSortChange(key: TSortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(sortKeyDefs.get(key)!.defaultDirection);
    }
    resetToFirstPage();
  }

  function handleDensityChange(next: Density) {
    setDensity(next);
    resetToFirstPage();
  }

  return {
    facets: facetState,
    sortKey,
    sortDirection,
    sortLabels,
    onSortChange: handleSortChange,
    density,
    onDensityChange: handleDensityChange,
    page: currentPage,
    totalPages,
    onPageChange: setPage,
    pageEntries,
    isEmpty: entries.length === 0,
    hasNoMatches: entries.length > 0 && processedEntries.length === 0,
  };
}
