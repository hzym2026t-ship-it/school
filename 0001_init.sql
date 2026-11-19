-- =====================================================================
-- School Evaluation Teams Platform - initial schema
-- Run once in Supabase Dashboard -> SQL Editor (or `supabase db push`).
-- =====================================================================

-- ---------- Types ----------------------------------------------------
create type public.app_role as enum ('leader', 'officer');                     -- رئيس فريق / ضابط جودة
create type public.rating as enum ('high', 'acceptable', 'weak', 'very_weak'); -- مرتفع / مقبول / ضعيف / ضعيف جدا
create type public.member_role as enum ('leader', 'member');                   -- رئيس / عضو
create type public.visit_status as enum ('planned', 'completed', 'postponed', 'cancelled');

-- ---------- Allow-list: only these emails can sign up / sign in ------
create table public.allowed_emails (
  email      text primary key check (email = lower(btrim(email)) and email like '%_@_%'),
  role       public.app_role not null default 'leader',
  full_name  text,
  added_by   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Profiles (one per auth user) -----------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  role       public.app_role not null,
  full_name  text,
  phone      text,
  created_at timestamptz not null default now()
);

-- ---------- The 8 evaluation criteria (المعايير الثمانية) -----------
create table public.criteria (
  id    smallint primary key check (id between 1 and 8),
  title text not null
);
insert into public.criteria (id, title) values
  (1, 'جودة التعريف ببرنامج التقويم المدرسي'),
  (2, 'خلفية الأخصائيين عن المدرسة قبل الزيارة'),
  (3, 'دقة رصد وتوثيق وتنظيم الملاحظات'),
  (4, 'جودة إدارة المقابلات حوارا وتدوينا'),
  (5, 'جودة مداولات الفريق وفق المؤشرات والأدلة'),
  (6, 'التناغم والتكامل بين أعضاء الفريق'),
  (7, 'التواصل الإيجابي مع إدارة المدرسة ومنسوبيها'),
  (8, 'يصلح للقيام بعمل رئيس فريق');

-- ---------- Teams (G01, G02, ...) ------------------------------------
create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^G[0-9]{2,3}$'),
  leader_id  uuid unique references public.profiles(id) on delete set null,
  city       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  member_role public.member_role not null default 'member',
  full_name   text not null check (btrim(full_name) <> ''),
  national_id text,          -- السجل المدني
  phone       text,
  email       text,
  created_at  timestamptz not null default now()
);
create unique index team_members_one_leader on public.team_members(team_id) where member_role = 'leader';
create index team_members_team_idx on public.team_members(team_id);

-- ---------- School visits by a team ----------------------------------
create table public.visits (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  school_name     text not null check (btrim(school_name) <> ''),
  ministry_number text,      -- الرقم الوزاري
  school_type     text,
  city            text,
  visit_date      date,
  status          public.visit_status not null default 'planned',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index visits_team_idx on public.visits(team_id);

-- ---------- Evaluation of one member on one visit --------------------
-- Written by the team leader (members of their own team) or by a quality
-- officer (any member of any team, including the leader).
create table public.evaluations (
  id             uuid primary key default gen_random_uuid(),
  visit_id       uuid not null references public.visits(id) on delete cascade,
  member_id      uuid not null references public.team_members(id) on delete cascade,
  evaluator_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  evaluator_role public.app_role not null default 'leader',
  c1 public.rating, c2 public.rating, c3 public.rating, c4 public.rating,
  c5 public.rating, c6 public.rating, c7 public.rating, c8 public.rating,
  overall_level  public.rating,   -- المستوى العام
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (visit_id, member_id, evaluator_id)
);
create index evaluations_visit_idx on public.evaluations(visit_id);

-- ---------- Quality officer's visit to a team (sample visits) --------
create table public.officer_reviews (
  id            uuid primary key default gen_random_uuid(),
  visit_id      uuid not null references public.visits(id) on delete cascade,
  officer_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  review_date   date,
  overall_level public.rating,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (visit_id, officer_id)
);

-- =====================================================================
-- Helper functions (SECURITY DEFINER so RLS policies can call them
-- without recursion). An account counts only while its email is still
-- on the allow-list.
-- =====================================================================
create or replace function public.my_role()
returns public.app_role
language sql stable security definer set search_path = '' as $$
  select a.role
  from public.profiles p
  join public.allowed_emails a on a.email = p.email
  where p.id = auth.uid()
$$;

create or replace function public.is_officer()
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = 'officer', false)
$$;

create or replace function public.my_team_id()
returns uuid
language sql stable security definer set search_path = '' as $$
  select t.id from public.teams t
  where t.leader_id = auth.uid() and public.my_role() = 'leader'
$$;

-- =====================================================================
-- Triggers
-- =====================================================================

-- Sign-up gate: reject any auth user whose email is not on the list,
-- otherwise create the profile with the role chosen by the officer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_allowed public.allowed_emails;
begin
  select * into v_allowed from public.allowed_emails where email = lower(new.email);
  if not found then
    raise exception 'EMAIL_NOT_ALLOWED';
  end if;
  insert into public.profiles (id, email, role, full_name)
  values (new.id, lower(new.email), v_allowed.role, v_allowed.full_name);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Removing an email from the list removes the account. The team's data is
-- kept (teams.leader_id becomes null) so a replacement leader can take over.
create or replace function public.handle_email_removed()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.users where lower(email) = old.email;
  return old;
end $$;

create trigger on_allowed_email_deleted
  after delete on public.allowed_emails
  for each row execute function public.handle_email_removed();

-- Changing the role on the list updates the profile.
create or replace function public.handle_email_role_changed()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set role = new.role where email = new.email;
  return new;
end $$;

create trigger on_allowed_email_updated
  after update of role on public.allowed_emails
  for each row execute function public.handle_email_role_changed();

-- Stamp evaluator + role; make sure the member belongs to the visit's team
-- and that a leader evaluates members only (not themself).
create or replace function public.prepare_evaluation()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_member public.team_members;
  v_team   uuid;
begin
  if tg_op = 'UPDATE' and new.evaluator_id is distinct from old.evaluator_id then
    raise exception 'EVALUATOR_IS_FIXED';
  end if;
  if tg_op = 'INSERT' then
    new.evaluator_id := auth.uid();
    new.evaluator_role := public.my_role();
  else
    new.evaluator_role := old.evaluator_role;
  end if;
  if new.evaluator_role is null then
    raise exception 'NOT_ALLOWED';
  end if;
  select * into v_member from public.team_members where id = new.member_id;
  select team_id into v_team from public.visits where id = new.visit_id;
  if v_member.team_id is distinct from v_team then
    raise exception 'MEMBER_NOT_IN_VISIT_TEAM';
  end if;
  if new.evaluator_role = 'leader' and v_member.member_role <> 'member' then
    raise exception 'LEADER_EVALUATES_MEMBERS_ONLY';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger evaluations_prepare
  before insert or update on public.evaluations
  for each row execute function public.prepare_evaluation();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

create trigger teams_touch before update on public.teams
  for each row execute function public.touch_updated_at();
create trigger visits_touch before update on public.visits
  for each row execute function public.touch_updated_at();
create trigger officer_reviews_touch before update on public.officer_reviews
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.allowed_emails  enable row level security;
alter table public.profiles        enable row level security;
alter table public.criteria        enable row level security;
alter table public.teams           enable row level security;
alter table public.team_members    enable row level security;
alter table public.visits          enable row level security;
alter table public.evaluations     enable row level security;
alter table public.officer_reviews enable row level security;

-- allowed_emails: officers only. An officer can't remove their own email.
create policy "officers read allow-list" on public.allowed_emails
  for select to authenticated using (public.is_officer());
create policy "officers add to allow-list" on public.allowed_emails
  for insert to authenticated with check (public.is_officer());
create policy "officers update allow-list" on public.allowed_emails
  for update to authenticated using (public.is_officer()) with check (public.is_officer());
create policy "officers remove from allow-list" on public.allowed_emails
  for delete to authenticated
  using (public.is_officer() and email <> (select p.email from public.profiles p where p.id = auth.uid()));

-- profiles: see self; officers see all. Users may edit only name/phone.
create policy "read own profile or officer" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_officer());
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid() and public.my_role() is not null)
  with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

-- criteria: readable by active users.
create policy "read criteria" on public.criteria
  for select to authenticated using (public.my_role() is not null);

-- teams
create policy "read own team or officer" on public.teams
  for select to authenticated
  using ((leader_id = auth.uid() and public.my_role() = 'leader') or public.is_officer());
create policy "leader creates own team" on public.teams
  for insert to authenticated
  with check (leader_id = auth.uid() and public.my_role() = 'leader' and public.my_team_id() is null);
create policy "leader or officer updates team" on public.teams
  for update to authenticated
  using (id = public.my_team_id() or public.is_officer())
  with check ((id = public.my_team_id() and leader_id = auth.uid()) or public.is_officer());
create policy "officer deletes team" on public.teams
  for delete to authenticated using (public.is_officer());

-- team_members
create policy "members: own team or officer" on public.team_members
  for all to authenticated
  using (team_id = public.my_team_id() or public.is_officer())
  with check (team_id = public.my_team_id() or public.is_officer());

-- visits
create policy "visits: own team or officer" on public.visits
  for all to authenticated
  using (team_id = public.my_team_id() or public.is_officer())
  with check (team_id = public.my_team_id() or public.is_officer());

-- evaluations: officers read everything; a leader reads/writes only the
-- evaluations they wrote, for their own team.
create policy "read evaluations" on public.evaluations
  for select to authenticated using (
    public.is_officer()
    or (evaluator_id = auth.uid()
        and exists (select 1 from public.visits v where v.id = visit_id and v.team_id = public.my_team_id()))
  );
create policy "write evaluations" on public.evaluations
  for insert to authenticated with check (
    public.is_officer()
    or exists (select 1 from public.visits v where v.id = visit_id and v.team_id = public.my_team_id())
  );
create policy "update own evaluations" on public.evaluations
  for update to authenticated
  using (evaluator_id = auth.uid() and (
    public.is_officer()
    or exists (select 1 from public.visits v where v.id = visit_id and v.team_id = public.my_team_id())))
  with check (evaluator_id = auth.uid());
create policy "delete own evaluations" on public.evaluations
  for delete to authenticated
  using ((evaluator_id = auth.uid() and public.my_role() is not null) or public.is_officer());

-- officer_reviews: officers only.
create policy "officers read reviews" on public.officer_reviews
  for select to authenticated using (public.is_officer());
create policy "officers write own reviews" on public.officer_reviews
  for insert to authenticated with check (public.is_officer() and officer_id = auth.uid());
create policy "officers update own reviews" on public.officer_reviews
  for update to authenticated using (public.is_officer() and officer_id = auth.uid())
  with check (officer_id = auth.uid());
create policy "officers delete own reviews" on public.officer_reviews
  for delete to authenticated using (public.is_officer() and officer_id = auth.uid());

-- Nothing for anonymous users.
revoke all on all tables in schema public from anon;

-- =====================================================================
-- Leader onboarding: create the team and the leader's own member row in
-- one transaction. Runs with the caller's rights, so RLS still applies.
-- =====================================================================
create or replace function public.create_my_team(
  p_code text, p_city text, p_full_name text, p_national_id text, p_phone text
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_team  uuid;
  v_email text;
begin
  if public.my_role() is distinct from 'leader' then
    raise exception 'ONLY_LEADERS';
  end if;
  select email into v_email from public.profiles where id = auth.uid();
  insert into public.teams (code, leader_id, city)
  values (upper(btrim(p_code)), auth.uid(), nullif(btrim(p_city), ''))
  returning id into v_team;
  insert into public.team_members (team_id, member_role, full_name, national_id, phone, email)
  values (v_team, 'leader', btrim(p_full_name), nullif(btrim(p_national_id), ''),
          nullif(btrim(p_phone), ''), v_email);
  update public.profiles
     set full_name = btrim(p_full_name), phone = nullif(btrim(p_phone), '')
   where id = auth.uid();
  return v_team;
end $$;

revoke execute on function public.create_my_team(text, text, text, text, text) from anon, public;
grant execute on function public.create_my_team(text, text, text, text, text) to authenticated;
