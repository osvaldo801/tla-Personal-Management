create table if not exists public.ministry_departments (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (ministry_id, name)
);

create table if not exists public.server_profile_ministries (
  profile_id uuid not null references public.server_profiles(id) on delete cascade,
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, ministry_id)
);

create table if not exists public.server_profile_departments (
  profile_id uuid not null references public.server_profiles(id) on delete cascade,
  department_id uuid not null references public.ministry_departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, department_id)
);

insert into public.server_profile_ministries (profile_id, ministry_id)
select id, ministry_id
from public.server_profiles
where ministry_id is not null
on conflict do nothing;

insert into public.server_profile_ministries (profile_id, ministry_id)
select distinct sp.id, m.id
from public.server_profiles sp
cross join lateral regexp_split_to_table(coalesce(sp.service_ministries, ''), E'\\n') as item(name)
join public.ministries m on lower(trim(m.name)) = lower(trim(item.name))
where trim(item.name) <> ''
on conflict do nothing;

insert into public.ministry_departments (ministry_id, name, description, active)
select m.id, d.name, 'Departamento inicial', true
from public.ministries m
cross join (values ('Proyección'), ('Cámaras'), ('Luces'), ('Audio')) as d(name)
where lower(m.name) in ('multimedia', 'media')
on conflict (ministry_id, name) do update set active = true;

insert into public.ministry_departments (ministry_id, name, description, active)
select m.id, d.name, 'Departamento inicial', true
from public.ministries m
cross join (values ('Cuna'), ('Párvulos'), ('Primarios'), ('Pre adolescentes')) as d(name)
where lower(m.name) in ('escuela biblica', 'escuela bíblica')
on conflict (ministry_id, name) do update set active = true;

alter table public.ministry_departments enable row level security;
alter table public.server_profile_ministries enable row level security;
alter table public.server_profile_departments enable row level security;

drop policy if exists "Authenticated users can read ministry departments" on public.ministry_departments;
drop policy if exists "Admins can manage ministry departments" on public.ministry_departments;
drop policy if exists "Authenticated users can read profile ministries" on public.server_profile_ministries;
drop policy if exists "Admins and leaders can manage profile ministries" on public.server_profile_ministries;
drop policy if exists "Authenticated users can read profile departments" on public.server_profile_departments;
drop policy if exists "Admins and leaders can manage profile departments" on public.server_profile_departments;

create policy "Authenticated users can read ministry departments"
on public.ministry_departments
for select
to authenticated
using (true);

create policy "Admins can manage ministry departments"
on public.ministry_departments
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create policy "Authenticated users can read profile ministries"
on public.server_profile_ministries
for select
to authenticated
using (true);

create policy "Admins and leaders can manage profile ministries"
on public.server_profile_ministries
for all
to authenticated
using (app_private.is_admin() or app_private.is_ministry_leader())
with check (app_private.is_admin() or app_private.is_ministry_leader());

create policy "Authenticated users can read profile departments"
on public.server_profile_departments
for select
to authenticated
using (true);

create policy "Admins and leaders can manage profile departments"
on public.server_profile_departments
for all
to authenticated
using (app_private.is_admin() or app_private.is_ministry_leader())
with check (app_private.is_admin() or app_private.is_ministry_leader());

grant select, insert, update, delete on public.ministry_departments to authenticated;
grant select, insert, update, delete on public.server_profile_ministries to authenticated;
grant select, insert, update, delete on public.server_profile_departments to authenticated;
