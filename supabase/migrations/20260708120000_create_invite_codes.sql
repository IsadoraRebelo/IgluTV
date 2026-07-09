create table public.invite_codes (
  id bigint generated always as identity primary key,
  code text not null unique,
  is_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;
-- Intentionally no SELECT/UPDATE policies: the table is not reachable
-- directly via the Data API. All access goes through redeem_invite_code(),
-- which avoids both the check-then-act race and the enumeration risk a
-- permissive `using (true)` select policy would create.

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
