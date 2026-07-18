export type SortDirection = 'asc' | 'desc';
export type Density = 'dense' | 'large';

// A facet's option values and each entry's matching value(s) are always
// one of these two primitive kinds across all four families (decades and
// years are numbers; genres, services, and statuses are strings) — so one
// shared union covers every family without needing per-facet generics.
export type FacetValue = string | number;

// Static, per-family facet configuration (decade, genre, service, status,
// diary year, ...). `getOptions` computes the dropdown's option list from
// the full unfiltered entry list; `getValues` returns the value(s) a given
// entry matches against (an array so a single facet definition can express
// both "exactly one value, or none" facets like decade/service and
// "matches any of several" facets like genre).
export type FacetDef<TEntry> = {
  key: string;
  label: string;
  getOptions: (entries: TEntry[]) => FacetValue[];
  getValues: (entry: TEntry) => FacetValue[];
  optionLabel: (value: FacetValue) => string;
};

// The hook's per-render output for one facet: the static config plus live
// state (computed options, current selection, toggle handler) — this is
// what `ListFilterBar`/`FilterDropdown`/`MobileFilterSection` actually render.
export type FacetState = {
  key: string;
  label: string;
  options: FacetValue[];
  optionLabel: (value: FacetValue) => string;
  selected: Set<FacetValue>;
  onToggle: (value: FacetValue) => void;
};

// Every sort key in all four families is one of exactly two shapes:
// - 'comparator': a plain ascending comparator (progress ratio, name,
//   createdAt, popularity, watchedOn — all always-present values).
// - 'nullable-string': entries with a non-null string value are
//   localeCompare-sorted (and reversed if direction is 'desc'); entries
//   with a null value are always appended at the end, unaffected by
//   direction. This is the "release-date" pattern shared by all four
//   families (`show.year` in three of them, `firstAirDate` in CastPage).
export type SortStrategy<TEntry> =
  | { kind: 'comparator'; compare: (a: TEntry, b: TEntry) => number }
  | { kind: 'nullable-string'; getValue: (entry: TEntry) => string | null };

export type SortKeyDef<TEntry, TSortKey extends string> = {
  key: TSortKey;
  label: string;
  defaultDirection: SortDirection;
  strategy: SortStrategy<TEntry>;
};

// Only WatchedShowsView passes this (the one family with a density
// toggle) — the other three families pass a plain `number` page size.
export type DensityConfig = {
  initial: Density;
  pageSizeByDensity: Record<Density, number>;
};
