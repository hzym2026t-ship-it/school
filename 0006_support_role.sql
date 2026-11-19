-- =====================================================================
-- 0006: Technical support role (دعم فني).
-- A support user sees the issues (بلاغات) screen only: reads every issue,
-- sets its handling status and note. Nothing else an officer can see —
-- teams, members, visits, evaluations, reviews, users, directives, stats.
--
-- The new enum value is compared as text below, so the whole file can run
-- in one go from the SQL Editor.
-- =====================================================================
alter type public.app_role add value if not exists 'support';

create or replace function public.is_support()
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role()::text = 'support', false)
$$;
revoke execute on function public.is_support() from anon, public;
grant execute on function public.is_support() to authenticated;

-- ---------- Issues: support reads and handles, officers keep delete -----
drop policy if exists "read issues" on public.issues;
create policy "read issues" on public.issues
  for select to authenticated
  using (public.is_officer() or public.is_support() or team_id = public.my_team_id());

drop policy if exists "officers update issues" on public.issues;
create policy "officers or support update issues" on public.issues
  for update to authenticated
  using (public.is_officer() or public.is_support())
  with check (public.is_officer() or public.is_support());

-- Whoever handles an issue may only change its status and note; the
-- report itself (team, author, school, problem) stays as the leader sent it.
create or replace function public.prepare_issue()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by      := old.created_by;
    new.team_id         := old.team_id;
    new.problem         := old.problem;
    new.school_name     := old.school_name;
    new.school_type     := old.school_type;
    new.ministry_number := old.ministry_number;
    new.created_at      := old.created_at;
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

-- Labels the issues screen needs (team code, leader, who resolved it)
-- without giving support read access to teams, members or profiles.
create or replace function public.issue_labels()
returns table (issue_id uuid, team_code text, leader_name text, resolver_name text)
language sql stable security definer set search_path = '' as $$
  select i.id,
         t.code,
         coalesce(
           (select m.full_name from public.team_members m
             where m.team_id = i.team_id and m.member_role = 'leader' limit 1),
           (select p.full_name from public.profiles p where p.id = t.leader_id)
         ),
         r.full_name
  from public.issues i
  join public.teams t on t.id = i.team_id
  left join public.profiles r on r.id = i.resolved_by
  where public.is_officer() or public.is_support()
$$;
revoke execute on function public.issue_labels() from anon, public;
grant execute on function public.issue_labels() to authenticated;

-- ---------- Directives are for leaders and officers only ---------------
drop policy if exists "read directives" on public.directives;
create policy "read directives" on public.directives
  for select to authenticated using (
    public.is_officer()
    or (public.my_role()::text = 'leader' and (audience = 'all' or target_user = auth.uid()))
  );

-- ---------- Platform counts: not for support -------------------------
create or replace function public.platform_stats()
returns json
language sql stable security definer set search_path = '' as $$
  select case when public.my_role() is null or public.is_support() then null else json_build_object(
    'users',       (select count(*) from public.profiles p join public.allowed_emails a on a.email = p.email),
    'leaders',     (select count(*) from public.profiles p join public.allowed_emails a on a.email = p.email where a.role::text = 'leader'),
    'officers',    (select count(*) from public.profiles p join public.allowed_emails a on a.email = p.email where a.role::text = 'officer'),
    'teams',       (select count(*) from public.teams),
    'visits',      (select count(*) from public.visits),
    'completed',   (select count(*) from public.visits where status = 'completed'),
    'planned',     (select count(*) from public.visits where status = 'planned'),
    'not_visited', (select count(*) from public.visits where status = 'not_visited')
  ) end
$$;
