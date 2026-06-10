create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role text not null default 'ministry_leader' check (role in ('admin', 'ministry_leader')),
  ministry_id uuid references public.ministries(id),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_invitations enable row level security;

drop trigger if exists set_user_invitations_updated_at on public.user_invitations;

create trigger set_user_invitations_updated_at
before update on public.user_invitations
for each row
execute function public.set_updated_at();

drop policy if exists "Admins can manage user invitations" on public.user_invitations;

create policy "Admins can manage user invitations"
on public.user_invitations
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

grant select, insert, update, delete on public.user_invitations to authenticated;

create or replace function public.admin_create_user_invitation(
  target_email text,
  target_full_name text,
  target_role text default 'ministry_leader',
  target_ministry_id uuid default null
)
returns public.user_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(target_email));
  found_auth_id uuid;
  saved_invitation public.user_invitations;
begin
  if not app_private.is_admin() then
    raise exception 'Only administrators can manage users';
  end if;

  if normalized_email = '' then
    raise exception 'El email es obligatorio.';
  end if;

  if trim(target_full_name) = '' then
    raise exception 'El nombre es obligatorio.';
  end if;

  if target_role not in ('admin', 'ministry_leader') then
    raise exception 'Invalid role';
  end if;

  select id
  into found_auth_id
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  insert into public.user_invitations (
    email,
    full_name,
    role,
    ministry_id,
    accepted_by,
    accepted_at,
    revoked_at,
    created_by
  )
  values (
    normalized_email,
    trim(target_full_name),
    target_role,
    target_ministry_id,
    found_auth_id,
    case when found_auth_id is null then null else now() end,
    null,
    auth.uid()
  )
  on conflict (email) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      ministry_id = excluded.ministry_id,
      accepted_by = coalesce(public.user_invitations.accepted_by, excluded.accepted_by),
      accepted_at = coalesce(public.user_invitations.accepted_at, excluded.accepted_at),
      revoked_at = null,
      updated_at = now()
  returning * into saved_invitation;

  if found_auth_id is not null then
    insert into public.users (id, full_name, email, role, ministry_id)
    values (found_auth_id, trim(target_full_name), normalized_email, target_role, target_ministry_id)
    on conflict (email) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        ministry_id = excluded.ministry_id;
  end if;

  return saved_invitation;
end;
$$;

revoke all on function public.admin_create_user_invitation(text, text, text, uuid) from public;
grant execute on function public.admin_create_user_invitation(text, text, text, uuid) to authenticated;

create or replace function public.ensure_current_user_profile()
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.users;
  invitation public.user_invitations;
  current_email text := lower(coalesce(auth.email(), ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if current_email = 'osvaldo801@gmail.com' then
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
  else
    select *
    into invitation
    from public.user_invitations
    where lower(email) = current_email
      and revoked_at is null
    limit 1;

    if invitation.id is not null then
      insert into public.users (id, full_name, email, role, ministry_id)
      values (auth.uid(), invitation.full_name, current_email, invitation.role, invitation.ministry_id)
      on conflict (email) do update
      set id = excluded.id,
          full_name = excluded.full_name,
          role = excluded.role,
          ministry_id = excluded.ministry_id;

      update public.user_invitations
      set accepted_by = auth.uid(),
          accepted_at = coalesce(accepted_at, now()),
          updated_at = now()
      where id = invitation.id;
    end if;
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
