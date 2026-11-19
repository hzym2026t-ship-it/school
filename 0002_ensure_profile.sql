-- =====================================================================
-- Create a missing profile for the signed-in user when their email is on
-- the allow-list. Covers accounts created before 0001_init.sql was run,
-- or before their email was added to the list.
-- =====================================================================
create or replace function public.ensure_profile()
returns public.app_role
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
  v_allowed public.allowed_emails;
begin
  if auth.uid() is null then
    return null;
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  select * into v_allowed from public.allowed_emails where email = v_email;
  if not found then
    return null;
  end if;
  insert into public.profiles (id, email, role, full_name)
  values (auth.uid(), v_email, v_allowed.role, v_allowed.full_name)
  on conflict (id) do update set email = excluded.email, role = excluded.role;
  return v_allowed.role;
end $$;

revoke execute on function public.ensure_profile() from anon, public;
grant execute on function public.ensure_profile() to authenticated;
