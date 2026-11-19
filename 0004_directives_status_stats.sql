-- =====================================================================
-- 0004: visit statuses (تمت الزيارة / مجدولة / لم تتم الزيارة),
-- visit days + distance, directives (general / private), platform stats.
-- =====================================================================

-- ---------- Visit status: three values, stored as text ----------------
alter table public.visits alter column status drop default;
alter table public.visits alter column status type text using status::text;
update public.visits set status = 'not_visited' where status in ('postponed', 'cancelled');
alter table public.visits
  add constraint visits_status_check check (status in ('completed', 'planned', 'not_visited'));
alter table public.visits alter column status set default 'planned';
drop type if exists public.visit_status;

-- ---------- Visit days and distance -----------------------------------
alter table public.visits
  add column if not exists visit_days smallint not null default 1 check (visit_days between 1 and 30),
  add column if not exists distance_km numeric(6, 1) check (distance_km >= 0);

-- ---------- Directives (توجيهات) --------------------------------------
create table if not exists public.directives (
  id          uuid primary key default gen_random_uuid(),
  audience    text not null check (audience in ('all', 'user')),   -- عام / خاص
  target_user uuid references public.profiles(id) on delete cascade,
  title       text not null check (btrim(title) <> ''),
  body        text,
  created_by  uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  check ((audience = 'all' and target_user is null) or (audience = 'user' and target_user is not null))
);
create index if not exists directives_target_idx on public.directives(target_user);

alter table public.directives enable row level security;

create policy "read directives" on public.directives
  for select to authenticated using (
    public.is_officer()
    or (public.my_role() is not null and (audience = 'all' or target_user = auth.uid()))
  );
create policy "officers write directives" on public.directives
  for insert to authenticated with check (public.is_officer());
create policy "officers update directives" on public.directives
  for update to authenticated using (public.is_officer()) with check (public.is_officer());
create policy "officers delete directives" on public.directives
  for delete to authenticated using (public.is_officer());

grant select, insert, update, delete on public.directives to authenticated;
revoke all on public.directives from anon;

-- ---------- Platform-wide counts (numbers only, for every active user) -
create or replace function public.platform_stats()
returns json
language sql stable security definer set search_path = '' as $$
  select case when public.my_role() is null then null else json_build_object(
    'users',       (select count(*) from public.profiles p join public.allowed_emails a on a.email = p.email),
    'leaders',     (select count(*) from public.profiles p join public.allowed_emails a on a.email = p.email where a.role = 'leader'),
    'officers',    (select count(*) from public.profiles p join public.allowed_emails a on a.email = p.email where a.role = 'officer'),
    'teams',       (select count(*) from public.teams),
    'visits',      (select count(*) from public.visits),
    'completed',   (select count(*) from public.visits where status = 'completed'),
    'planned',     (select count(*) from public.visits where status = 'planned'),
    'not_visited', (select count(*) from public.visits where status = 'not_visited')
  ) end
$$;

revoke execute on function public.platform_stats() from anon, public;
grant execute on function public.platform_stats() to authenticated;
