create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.server_profiles(id) on delete cascade,
  user_id uuid references auth.users(id),
  comment text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create or replace function public.set_comment_actor()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;

  new.created_at := coalesce(new.created_at, now());
  return new;
end;
$$;

drop trigger if exists set_comment_actor on public.comments;

create trigger set_comment_actor
before insert on public.comments
for each row
execute function public.set_comment_actor();

drop policy if exists "Admins can manage all comments" on public.comments;
drop policy if exists "Authenticated users can read comments" on public.comments;
drop policy if exists "Authenticated users can insert comments" on public.comments;

create policy "Authenticated users can read comments"
on public.comments
for select
to authenticated
using (true);

create policy "Authenticated users can insert comments"
on public.comments
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can manage all comments"
on public.comments
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

grant select on public.organization_settings to authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.ministries to authenticated;
grant select, insert, update, delete on public.server_profiles to authenticated;
grant select, insert, update, delete on public.comments to authenticated;

create or replace function public.admin_upsert_user(
  target_email text,
  target_full_name text,
  target_role text,
  target_ministry_id uuid default null
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  found_auth_id uuid;
  saved_user public.users;
begin
  if not app_private.is_admin() then
    raise exception 'Only administrators can manage users';
  end if;

  if target_role not in ('admin', 'ministry_leader') then
    raise exception 'Invalid role';
  end if;

  select id
  into found_auth_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if found_auth_id is null then
    raise exception 'El usuario debe iniciar sesion una vez con Google antes de asignarle un rol.';
  end if;

  insert into public.users (id, full_name, email, role, ministry_id)
  values (found_auth_id, target_full_name, lower(target_email), target_role, target_ministry_id)
  on conflict (email) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      ministry_id = excluded.ministry_id
  returning * into saved_user;

  return saved_user;
end;
$$;

revoke all on function public.admin_upsert_user(text, text, text, uuid) from public;
grant execute on function public.admin_upsert_user(text, text, text, uuid) to authenticated;

insert into public.comments (profile_id, comment)
select sp.id, seed.comment
from (
  values
    ('ana.martinez@example.com', 'Disponible para apoyo extra en eventos especiales.'),
    ('carlos.rivera@example.com', 'Revisar disponibilidad para transmision de domingo.'),
    ('sofia.hernandez@example.com', 'Excelente seguimiento con nuevos servidores.'),
    ('miguel.torres@example.com', 'Pausa temporal por horario laboral.'),
    ('laura.gomez@example.com', 'Actualizar entrenamiento de caja y recursos.'),
    ('jose.ramirez@example.com', 'Asignado a recepcion principal este mes.'),
    ('daniela.cruz@example.com', 'Interesada en aprender camaras.'),
    ('roberto.flores@example.com', 'Perfil cancelado, conservar historial.'),
    ('paola.morales@example.com', 'Buen desempeno en cafeteria.'),
    ('andres.castillo@example.com', 'Pendiente confirmar nueva disponibilidad.')
) as seed(email, comment)
join public.server_profiles sp on lower(sp.email) = lower(seed.email)
where not exists (
  select 1
  from public.comments c
  where c.profile_id = sp.id
);
