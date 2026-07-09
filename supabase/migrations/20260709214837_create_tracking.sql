create table public.show_tracking (
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_show_id integer not null,
  status text not null check (
    status in ('watching', 'watch_later', 'paused', 'dropped', 'completed')
  ),
  is_favourite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_show_id)
);

alter table public.show_tracking enable row level security;

-- Unlike invite_codes, this is the user's own private data, so direct
-- Data-API access scoped by auth.uid() is appropriate (no RPC needed).
create policy "select own show tracking" on public.show_tracking
  for select using (auth.uid() = user_id);

create policy "insert own show tracking" on public.show_tracking
  for insert with check (auth.uid() = user_id);

create policy "update own show tracking" on public.show_tracking
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own show tracking" on public.show_tracking
  for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger show_tracking_set_updated_at
  before update on public.show_tracking
  for each row
  execute function public.set_updated_at();

create table public.episode_watches (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_show_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  watched_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index episode_watches_user_show_episode_idx
  on public.episode_watches (user_id, tmdb_show_id, season_number, episode_number);

alter table public.episode_watches enable row level security;

create policy "select own episode watches" on public.episode_watches
  for select using (auth.uid() = user_id);

create policy "insert own episode watches" on public.episode_watches
  for insert with check (auth.uid() = user_id);

create policy "update own episode watches" on public.episode_watches
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own episode watches" on public.episode_watches
  for delete using (auth.uid() = user_id);
