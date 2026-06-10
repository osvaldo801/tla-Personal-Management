create table if not exists public.service_status_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.service_status_options enable row level security;

drop policy if exists "Authenticated users can read service status options" on public.service_status_options;
drop policy if exists "Admins can manage service status options" on public.service_status_options;

create policy "Authenticated users can read service status options"
on public.service_status_options
for select
to authenticated
using (true);

create policy "Admins can manage service status options"
on public.service_status_options
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

grant select, insert, update, delete on public.service_status_options to authenticated;

insert into public.service_status_options (name)
values ('Activo'), ('Pausado'), ('Cancelado')
on conflict (name) do update
set active = true;

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.server_profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%service_status%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.server_profiles drop constraint %I', constraint_name);
  end if;
end;
$$;
