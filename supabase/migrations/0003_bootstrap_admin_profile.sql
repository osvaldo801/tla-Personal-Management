create or replace function public.ensure_current_user_profile()
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.users;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if lower(coalesce(auth.email(), '')) = 'osvaldo801@gmail.com' then
    insert into public.users (id, full_name, email, role)
    values (
      auth.uid(),
      coalesce(
        auth.jwt()->'user_metadata'->>'full_name',
        auth.jwt()->'user_metadata'->>'name',
        'Osvaldo Vasquez'
      ),
      auth.email(),
      'admin'
    )
    on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        role = 'admin';
  end if;

  select *
  into profile
  from public.users
  where id = auth.uid();

  return profile;
end;
$$;

revoke all on function public.ensure_current_user_profile() from public;
grant execute on function public.ensure_current_user_profile() to authenticated;
