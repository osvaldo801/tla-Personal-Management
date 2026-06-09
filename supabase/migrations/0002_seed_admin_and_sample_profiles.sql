-- Datos iniciales para desarrollo y demo.
-- Ejecutar despues de que osvaldo801@gmail.com haya iniciado sesion al menos una vez con Google.

create table if not exists public.ministries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ministries enable row level security;

drop policy if exists "Authenticated users can read ministries" on public.ministries;
drop policy if exists "Admins can manage ministries" on public.ministries;

create policy "Authenticated users can read ministries"
on public.ministries
for select
to authenticated
using (true);

create policy "Admins can manage ministries"
on public.ministries
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create table if not exists public.server_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  photo_url text,
  address text,
  phone text,
  email text,
  birth_date date,
  gender text,
  marital_status text,
  medical_notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  service_start_date date,
  service_status text not null default 'Activo' check (service_status in ('Activo', 'Pausado', 'Cancelado')),
  service_type text not null default 'Ministerial' check (service_type in ('Administrativo', 'Ministerial')),
  ministry_id uuid references public.ministries(id),
  active boolean not null default true,
  paused_reason text,
  documents_urls text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.server_profiles enable row level security;

drop policy if exists "Admins can manage all server profiles" on public.server_profiles;
drop policy if exists "Ministry leaders can read their ministry profiles" on public.server_profiles;
drop policy if exists "Ministry leaders can update their ministry profiles" on public.server_profiles;

create policy "Admins can manage all server profiles"
on public.server_profiles
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create policy "Ministry leaders can read their ministry profiles"
on public.server_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'ministry_leader'
      and u.ministry_id = server_profiles.ministry_id
  )
);

create policy "Ministry leaders can update their ministry profiles"
on public.server_profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'ministry_leader'
      and u.ministry_id = server_profiles.ministry_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'ministry_leader'
      and u.ministry_id = server_profiles.ministry_id
  )
);

insert into public.ministries (name, description)
values
  ('Libreria', 'Equipo de libreria y recursos.'),
  ('Cafeteria', 'Servicio de cafeteria.'),
  ('Acomodacion', 'Recepcion y apoyo en asientos.'),
  ('Alabanza', 'Equipo musical y vocal.'),
  ('Media', 'Audio, video y transmision.')
on conflict (name) do update
set description = excluded.description,
    active = true;

insert into public.users (id, full_name, email, role)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'Osvaldo Vasquez'),
  au.email,
  'admin'
from auth.users au
where lower(au.email) = 'osvaldo801@gmail.com'
on conflict (id) do update
set full_name = excluded.full_name,
    email = excluded.email,
    role = 'admin';

insert into public.server_profiles (
  full_name,
  address,
  phone,
  email,
  birth_date,
  gender,
  marital_status,
  emergency_contact_name,
  emergency_contact_phone,
  service_start_date,
  service_status,
  service_type,
  ministry_id,
  active
)
select
  seed.full_name,
  seed.address,
  seed.phone,
  seed.email,
  seed.birth_date,
  seed.gender,
  seed.marital_status,
  seed.emergency_contact_name,
  seed.emergency_contact_phone,
  seed.service_start_date,
  seed.service_status,
  seed.service_type,
  m.id,
  seed.active
from (
  values
    ('Ana Martinez', '1120 E 12th St, Los Angeles, CA 90021', '(213) 555-0101', 'ana.martinez@example.com', '1991-04-12'::date, 'Femenino', 'Soltera', 'Luis Martinez', '(213) 555-1101', '2022-01-15'::date, 'Activo', 'Ministerial', 'Alabanza', true),
    ('Carlos Rivera', '2401 S Main St, Los Angeles, CA 90007', '(213) 555-0102', 'carlos.rivera@example.com', '1987-09-03'::date, 'Masculino', 'Casado', 'Maria Rivera', '(213) 555-1102', '2021-06-20'::date, 'Activo', 'Administrativo', 'Media', true),
    ('Sofia Hernandez', '815 E 7th St, Los Angeles, CA 90021', '(213) 555-0103', 'sofia.hernandez@example.com', '1995-11-22'::date, 'Femenino', 'Soltera', 'Elena Hernandez', '(213) 555-1103', '2023-03-05'::date, 'Activo', 'Ministerial', 'Acomodacion', true),
    ('Miguel Torres', '1435 S Central Ave, Los Angeles, CA 90021', '(213) 555-0104', 'miguel.torres@example.com', '1982-02-18'::date, 'Masculino', 'Casado', 'Rosa Torres', '(213) 555-1104', '2020-10-12'::date, 'Pausado', 'Ministerial', 'Cafeteria', true),
    ('Laura Gomez', '920 E Pico Blvd, Los Angeles, CA 90021', '(213) 555-0105', 'laura.gomez@example.com', '1990-07-30'::date, 'Femenino', 'Casada', 'Daniel Gomez', '(213) 555-1105', '2022-08-01'::date, 'Activo', 'Administrativo', 'Libreria', true),
    ('Jose Ramirez', '1600 Maple Ave, Los Angeles, CA 90015', '(213) 555-0106', 'jose.ramirez@example.com', '1978-12-09'::date, 'Masculino', 'Casado', 'Patricia Ramirez', '(213) 555-1106', '2019-04-18'::date, 'Activo', 'Ministerial', 'Acomodacion', true),
    ('Daniela Cruz', '510 S Alameda St, Los Angeles, CA 90013', '(213) 555-0107', 'daniela.cruz@example.com', '1998-05-27'::date, 'Femenino', 'Soltera', 'Claudia Cruz', '(213) 555-1107', '2024-02-10'::date, 'Activo', 'Ministerial', 'Media', true),
    ('Roberto Flores', '1330 E Olympic Blvd, Los Angeles, CA 90021', '(213) 555-0108', 'roberto.flores@example.com', '1985-01-14'::date, 'Masculino', 'Casado', 'Silvia Flores', '(213) 555-1108', '2021-11-06'::date, 'Cancelado', 'Ministerial', 'Alabanza', false),
    ('Paola Morales', '735 Kohler St, Los Angeles, CA 90021', '(213) 555-0109', 'paola.morales@example.com', '1993-08-16'::date, 'Femenino', 'Soltera', 'Jorge Morales', '(213) 555-1109', '2023-09-14'::date, 'Activo', 'Administrativo', 'Cafeteria', true),
    ('Andres Castillo', '1025 S San Pedro St, Los Angeles, CA 90015', '(213) 555-0110', 'andres.castillo@example.com', '1989-03-21'::date, 'Masculino', 'Soltero', 'Carmen Castillo', '(213) 555-1110', '2022-05-25'::date, 'Activo', 'Ministerial', 'Libreria', true)
) as seed (
  full_name,
  address,
  phone,
  email,
  birth_date,
  gender,
  marital_status,
  emergency_contact_name,
  emergency_contact_phone,
  service_start_date,
  service_status,
  service_type,
  ministry_name,
  active
)
join public.ministries m on m.name = seed.ministry_name
on conflict do nothing;
