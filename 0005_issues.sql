-- =====================================================================
-- 0005: Issues (بلاغات) — a team leader reports a problem with a school
-- assigned to them; quality officers handle it and mark it resolved.
-- =====================================================================
create table if not exists public.issues (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  created_by      uuid default auth.uid() references public.profiles(id) on delete set null,
  problem         text not null check (btrim(problem) <> ''),        -- تحديد المشكلة
  school_name     text,
  school_type     text,
  ministry_number text,
  status          text not null default 'in_progress'
                  check (status in ('in_progress', 'resolved')),     -- تحت الإجراء / تمت
  officer_note    text,                                              -- ملاحظة ضابط الجودة
  resolved_by     uuid references public.profiles(id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists issues_team_idx on public.issues(team_id);
create index if not exists issues_status_idx on public.issues(status);

-- Keep audit fields honest: creator is the caller; resolution is stamped.
create or replace function public.prepare_issue()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.team_id := old.team_id;
  end if;
  if new.status = 'resolved' and (tg_op = 'INSERT' or old.status is distinct from 'resolved') then
    new.resolved_by := auth.uid();
    new.resolved_at := now();
  elsif new.status <> 'resolved' then
    new.resolved_by := null;
    new.resolved_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists issues_prepare on public.issues;
create trigger issues_prepare
  before insert or update on public.issues
  for each row execute function public.prepare_issue();

alter table public.issues enable row level security;

-- Leaders: see and submit issues for their own team only (always new ones).
-- Officers: see everything, update status/notes, delete.
create policy "read issues" on public.issues
  for select to authenticated
  using (public.is_officer() or team_id = public.my_team_id());
create policy "leader submits issue" on public.issues
  for insert to authenticated
  with check (team_id = public.my_team_id() and status = 'in_progress');
create policy "officers update issues" on public.issues
  for update to authenticated
  using (public.is_officer()) with check (public.is_officer());
create policy "officers delete issues" on public.issues
  for delete to authenticated
  using (public.is_officer());

grant select, insert, update, delete on public.issues to authenticated;
revoke all on public.issues from anon;
