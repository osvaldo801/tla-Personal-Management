create or replace function app_private.is_ministry_leader()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'ministry_leader'
  );
$$;

revoke all on function app_private.is_ministry_leader() from public;
grant execute on function app_private.is_ministry_leader() to authenticated;

drop policy if exists "Ministry leaders can read their ministry profiles" on public.server_profiles;
drop policy if exists "Ministry leaders can read all server profiles" on public.server_profiles;
drop policy if exists "Ministry leaders can create server profiles" on public.server_profiles;

create policy "Ministry leaders can read all server profiles"
on public.server_profiles
for select
to authenticated
using (app_private.is_ministry_leader());

create policy "Ministry leaders can create server profiles"
on public.server_profiles
for insert
to authenticated
with check (app_private.is_ministry_leader());
