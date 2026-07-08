# Supabase Auth Popup — Design

## Goal

Add email/password authentication to IgluTV, following the pattern already
established in the sibling project `my-tiny-iglu`: Supabase SSR clients, a
thin service layer, Zod-validated server actions, react-hook-form + toast
feedback. Unlike my-tiny-iglu, this is **not** a full-page gated flow — it's
a popup reachable from a button (later a menu item), and the app stays
publicly browsable.

## Why this shape

`my-tiny-iglu` has three properties this design deliberately does *not*
copy 1:1, each because IgluTV's requirements differ:

1. **No forced auth gate.** my-tiny-iglu's `proxy.ts` redirects every
   unauthenticated request to `/login`. IgluTV's homepage (TMDB popular
   shows) is meant to stay public — login is optional, for future
   personalization features. `updateSession` here only refreshes the
   Supabase session cookie; it never redirects.
2. **No dedicated `/login` / `/signup` routes.** The login/signup/recover
   forms live in one `AuthDialog` (Radix Dialog) that switches views,
   triggered by a button instead of route navigation. The one exception is
   `/confirm`, which must stay a real route because Supabase's password
   recovery email links directly to it.
3. **Invite-code redemption is atomic, not two-step.** my-tiny-iglu's
   `getInviteCode` (select) followed by `markInviteCodeUsed` (update) is a
   check-then-act race: two signups with the same code could both pass
   validation before either marks it used. This design replaces both with
   one `SECURITY DEFINER` Postgres function,
   `redeem_invite_code(p_code text) returns boolean`, that does the
   check-and-mark in a single `UPDATE ... WHERE is_used = false RETURNING`.
   It also means the `invite_codes` table itself needs no SELECT/UPDATE RLS
   policy reachable by `anon` — avoiding the enumeration risk a permissive
   `using (true)` select policy would create (anyone could list all invite
   codes via the Data API without needing to already know one).

Everything else (client structure, service-layer shape, form validation
approach, ServiceError pattern) follows my-tiny-iglu directly, since that's
the explicit ask.

## Dependencies

Add to `package.json`:
`@supabase/ssr`, `@supabase/supabase-js`, `zod`, `react-hook-form`,
`@hookform/resolvers`, `sonner`, `@radix-ui/react-dialog`,
`@radix-ui/react-slot`, `lucide-react`.

`.env.local` already has `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` populated — no env changes needed.

(Unrelated finding: `.env.local` has a stray `Client ID:` / `Client secret:`
pair for Google OAuth, not in `KEY=value` format, so Next.js doesn't load it
today. Not part of this task — flagging so it doesn't get treated as
already-wired, and the secret should be rotated if it's ever been shared
outside this file.)

## Database migration

`supabase/migrations/<timestamp>_create_invite_codes.sql`:

```sql
create table public.invite_codes (
  id bigint generated always as identity primary key,
  code text not null unique,
  is_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;
-- Intentionally no SELECT/UPDATE policies: the table is not reachable
-- directly via the Data API. All access goes through redeem_invite_code().

create or replace function public.redeem_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  update public.invite_codes
    set is_used = true, updated_at = now()
  where code = p_code and is_used = false
  returning id into v_id;

  return v_id is not null;
end;
$$;

revoke all on function public.redeem_invite_code(text) from public;
grant execute on function public.redeem_invite_code(text) to anon, authenticated;
```

This migration file will be written for review but **not applied** to the
live Supabase project as part of this task — applying it requires either
the Supabase MCP OAuth flow (not yet started) or you running it yourself via
`supabase db push` / the SQL editor.

Trade-off worth naming: redeeming before signup completes means a code is
consumed even if `signUp` subsequently fails (e.g. duplicate email). This
favors "no double-redemption" over "no wasted codes," which fits a small
invite-gated app better than the reverse.

## Supabase clients (`src/supabase/`)

- `client.ts` — `createBrowserClient` singleton (identical to my-tiny-iglu).
- `server.ts` — `cache`-wrapped `createServerClient` reading/writing cookies
  via `next/headers` (identical).
- `middleware.ts` — `updateSession(request)`: refreshes the session cookie
  via `supabase.auth.getUser()` and forwards `x-user-id` /
  `x-pathname` headers. **No redirect branch** (this is the deliberate
  deviation described above).
- Root `proxy.ts` calls `updateSession`, with the same static-asset-excluding
  matcher my-tiny-iglu uses.
- `database.types.ts` — hand-authored minimal `Database` type covering just
  `invite_codes`, since the Supabase CLI isn't linked in this project yet
  (no `supabase gen types` run). Can be regenerated later once linked.

## Service layer (`src/services/`)

- `errors.ts` — `ServiceError` (identical to my-tiny-iglu).
- `auth.ts` — `signInWithPassword(email, password)`, `signUp(email,
  password, username)`, `resetPasswordForEmail(email, redirectTo)`. Same
  shape as my-tiny-iglu; `updateUserAccount` omitted (no account page in
  this scope).
- `invite-codes.ts` — single function `redeemInviteCode(code): Promise<boolean>`
  calling `supabase.rpc('redeem_invite_code', { p_code: code })`, replacing
  my-tiny-iglu's `getInviteCode` + `markInviteCodeUsed` pair.

## Types (`src/types/forms/auth.ts`)

Zod schemas ported directly: `loginFormSchema`, `signupFormSchema` (email,
password, name, invite_code), `recoverPasswordFormSchema`, with inferred
`LoginUserInput` / `CreateUserInput` / `RecoverPasswordUserInput` types.
Barrel-exported through `src/types/index.ts` alongside the existing
`tv-show` types.

## UI components (`src/components/`)

Ported/adapted:

- `atoms/Button/Button.tsx`, `atoms/Input/Input.tsx`,
  `atoms/Input/FormInput.tsx` — same variant-based structure as
  my-tiny-iglu, restyled to plain Tailwind classes.
- `Form/Form.tsx` — `Form`, `FormField`, `FormItem`, `FormControl`,
  `FormMessage` (react-hook-form context wiring, unchanged from
  my-tiny-iglu).
- `Toaster/Toaster.tsx` — sonner wrapper, simplified (no custom
  `classNames` tied to my-tiny-iglu's token names).

New CSS variables added to `app/globals.css` (only what these components
need — not my-tiny-iglu's full HSL palette): `--muted`,
`--muted-foreground`, `--primary-foreground`, `--destructive`, each with a
light/dark value consistent with the existing `--background`/`--foreground`
pair.

## Auth feature (`src/components/Auth/`)

- `AuthDialog.tsx` — client component wrapping `@radix-ui/react-dialog`.
  Holds `view: 'login' | 'signup' | 'recover'` state; renders the matching
  form and links to switch views (mirroring my-tiny-iglu's
  `dynamic-layout.tsx` link structure, but as in-dialog state instead of
  navigation).
- `LoginForm.tsx`, `SignUpForm.tsx`, `RecoverForm.tsx` — react-hook-form +
  zodResolver, calling the server actions below, `sonner` toast on
  error/success, closing the dialog and `router.refresh()` on success.
- `actions.ts` — `'use server'` actions: `loginWithEmailAndPassword`,
  `signUpWithEmailAndPassword` (calls `redeemInviteCode` before `signUp`;
  returns `'Invalid invite code'` error if redemption fails),
  `recoverPasswordWithEmail`. Same parse-then-try/catch-`ServiceError`
  shape as my-tiny-iglu's `action.ts` files.
- `AuthButton.tsx` — server component. Reads the current user via the
  Supabase server client; renders a "Log in" button (opens `AuthDialog`) if
  signed out, or the user's email + a logout button if signed in.

## Confirm route

`app/confirm/route.ts` — `GET` handler, ported directly from my-tiny-iglu:
verifies the OTP token from the recovery email, redirects to `/` on
success or back to the homepage with an error query param on failure (no
`/login?recover=true` target to redirect to, since there's no such route —
the error will surface via a toast read from the query param on page load
instead).

## Wiring into existing files

- `app/layout.tsx` — add `<Toaster />`.
- `app/page.tsx` — add `<AuthButton />` positioned top-right.
- `tsconfig.json` — no new path aliases needed; `@/supabase/*` will need to
  be added alongside the existing `@/components`, `@/services`, etc.
  aliases.

## Out of scope

- Google/OAuth login (unrelated; flagged separately above).
- Dedicated `/login`, `/signup` pages.
- Forced auth gating / redirect-when-signed-out.
- Account settings / update-profile UI (`updateUserAccount` service
  function omitted).
- Regenerating `database.types.ts` via the Supabase CLI (hand-authored
  instead, since the CLI isn't linked here).

## Testing

No existing test setup in this repo (matches the earlier TMDB design spec's
note). Verification will be manual: run `npm run dev`, confirm the Log In
button opens the dialog, sign up with a valid invite code, confirm login
works, confirm an invalid/reused invite code is rejected, confirm the
recover-password email flow round-trips through `/confirm`, confirm logout
works, and confirm the homepage is still reachable while signed out.
