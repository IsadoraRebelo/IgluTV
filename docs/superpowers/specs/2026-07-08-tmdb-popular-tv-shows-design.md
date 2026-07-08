# TMDB Popular TV Shows — Design

## Goal

Show a list of 10 TV shows on the IgluTV homepage, sourced from The Movie
Database (TMDB) API (https://developer.themoviedb.org/docs/append-to-response).
Only TV shows are in scope — no movies. This is a first step toward a broader
TMDB integration; scope here is strictly the list, not show detail pages.

## Why this shape

IgluTV is a fresh `create-next-app` scaffold. Two sibling projects
(`my-tiny-iglu`, `collection`) already establish the conventions this repo
should follow: a `src/` directory for non-route code (`services`, `types`,
`consts`, `components`, `utils`), route code living in `app/`, and explicit
`tsconfig.json` path aliases per `src/` subfolder. This design adopts that
structure rather than introducing anything new.

For the external-API error-handling pattern specifically, `collection` has a
direct precedent: `app/fixtures-api.ts` calls a third-party sports API
(Sofascore) with a `RAPIDAPI_KEY` from `process.env`, wrapped in try/catch,
warning-logging and returning a safe empty fallback on failure, and caching
the result with `unstable_cache`. TMDB is the same shape of dependency (an
external API outside our control), so the TV shows service follows that same
pattern rather than the `ServiceError`/`handleApiError` pattern used for
internal Supabase calls.

## `append_to_response` scope note

TMDB's `append_to_response` query param bundles extra sub-resources (credits,
videos, images, etc.) onto a *single resource's detail* request — e.g.
`/tv/{id}?append_to_response=credits,videos`. It does not apply to list
endpoints like `/tv/popular`, which already return a flat array of shows. This
design does not use it. The service layer is structured so that a later
`/tv/[id]` detail page could add `append_to_response` without restructuring
anything already built here.

## Structure

```
src/
  consts/
    tmdb.ts        # TMDB_API_BASE_URL, TMDB_IMAGE_BASE_URL
    index.ts       # barrel export
  types/
    tv-show.ts     # TvShow (display shape) + TMDBTvShowRaw (API response shape)
  services/
    tv-shows.ts    # 'use server'; getPopularTvShows() -> TvShow[]
  components/
    TvShowCard/
      TvShowCard.tsx
app/
  page.tsx         # replaces create-next-app boilerplate; renders the grid
```

### `src/consts/tmdb.ts`

```ts
export const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';
```

### `src/types/tv-show.ts`

```ts
export type TvShow = {
  id: number;
  name: string;
  overview: string;
  posterUrl: string | null;
  firstAirDate: string;
  voteAverage: number;
};

export type TMDBTvShowRaw = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
};
```

### `src/services/tv-shows.ts`

- `'use server'` directive.
- Reads `TMDB_API_KEY` from `process.env`. If missing, `console.warn` and
  return `[]` (same guard as `fixtures-api.ts`'s `RAPIDAPI_KEY` check).
- Fetches `GET {TMDB_API_BASE_URL}/tv/popular?api_key=...&language=en-US&page=1`.
- On non-`ok` response or thrown error: `console.warn`/`console.error` and
  return `[]`.
- Maps the first 10 results from `TMDBTvShowRaw` to `TvShow`, building
  `posterUrl` from `TMDB_IMAGE_BASE_URL + poster_path` (or `null` if no
  poster).
- Wrapped in `unstable_cache` from `next/cache`, key `['popular-tv-shows']`,
  `{ revalidate: 3600, tags: ['popular-tv-shows'] }` — matches the
  `getTodaysFixtures` / `getData` caching pattern in `collection`.
- Exported function: `getPopularTvShows(): Promise<TvShow[]>`.

### `src/components/TvShowCard/TvShowCard.tsx`

Presentational, client-agnostic (server-renderable) card:
- Poster image via `next/image` (falls back to a placeholder block if
  `posterUrl` is `null`).
- Show name.
- First-air year (parsed from `firstAirDate`).
- Rating badge (`voteAverage`, one decimal place).

### `app/page.tsx`

- Server component, `async function Home()`.
- Calls `getPopularTvShows()` directly (no colocated `app/api.ts` wrapper
  needed — there's only one caller and no error-boundary translation to do,
  since the service already degrades to `[]`).
- Renders a responsive grid (Tailwind, matching the existing
  `globals.css`/Geist font setup already in the repo) of `TvShowCard`s.
- If the list is empty (fetch failed or key missing), shows a simple empty
  state message instead of an error page.

## Config changes

- **`tsconfig.json`**: add the same explicit path aliases as the sibling
  projects — `@/components`, `@/components/*`, `@/services`, `@/services/*`,
  `@/consts`, `@/consts/*`, `@/types`, `@/types/*` — all pointing at the
  matching `src/*` subfolder, alongside the existing generic `@/*` → `./*`.
- **`next.config.ts`**: add `images.remotePatterns` entry for
  `image.tmdb.org` (protocol `https`, pathname `/**`), so `next/image` can
  serve TMDB posters.
- **`.env.local`**: add `TMDB_API_KEY=<key>` (already covered by the
  existing `.env*` gitignore rule).

## Out of scope

- Movies (explicitly TV-only per the request).
- Show detail pages / `append_to_response` usage.
- Pagination, search, filtering.
- Any persistence (Supabase) — this is a pure external-API read, cached
  in-memory via `unstable_cache`.

## Testing

No existing test setup in this repo (no Vitest/Jest config, unlike the
sibling projects). Verification will be manual: run `npm run dev`, confirm
the homepage renders 10 TV show cards with posters, names, years, and
ratings, and confirm graceful empty-state behavior if `TMDB_API_KEY` is
removed.
