-- =====================================================================
-- Explicit privileges for signed-in users.
-- Newer Supabase projects don't grant table access to the `authenticated`
-- role by default, so grant exactly what the app needs. Row Level Security
-- policies (0001_init.sql) still decide which rows each user can touch.
-- =====================================================================
grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.allowed_emails,
  public.teams,
  public.team_members,
  public.visits,
  public.evaluations,
  public.officer_reviews
to authenticated;

grant select on public.profiles, public.criteria to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

grant execute on function
  public.my_role(),
  public.is_officer(),
  public.my_team_id(),
  public.ensure_profile(),
  public.create_my_team(text, text, text, text, text)
to authenticated;

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;
revoke execute on function
  public.ensure_profile(),
  public.create_my_team(text, text, text, text, text)
from anon;
