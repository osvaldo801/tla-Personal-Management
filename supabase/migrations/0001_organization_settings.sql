-- Configuracion institucional editable.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  role text not null check (role in ('admin', 'ministry_leader')),
  ministry_id uuid,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create schema if not exists app_private;

create or replace function app_private.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function app_private.is_admin() from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_admin() to authenticated;

drop policy if exists "Users can read their own administrative profile" on public.users;
drop policy if exists "Admins can read all administrative users" on public.users;
drop policy if exists "Admins can manage administrative users" on public.users;

create policy "Users can read their own administrative profile"
on public.users
for select
to authenticated
using (id = auth.uid());

create policy "Admins can read all administrative users"
on public.users
for select
to authenticated
using (app_private.is_admin());

create policy "Admins can manage administrative users"
on public.users
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create table if not exists public.organization_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  organization_name text not null,
  address text not null,
  phone text not null,
  email text,
  website text,
  logo_url text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint organization_settings_singleton
    check (id = '00000000-0000-0000-0000-000000000001'::uuid),
  constraint organization_settings_email_format
    check (email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint organization_settings_website_format
    check (website is null or website ~* '^https?://')
);

alter table public.organization_settings enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_organization_settings_updated_at on public.organization_settings;

create trigger set_organization_settings_updated_at
before update on public.organization_settings
for each row
execute function public.set_updated_at();

insert into public.organization_settings (
  id,
  organization_name,
  address,
  phone,
  logo_url
)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Taber Los Angeles',
  '1000 E Washington Blvd, Los Angeles, CA 90021',
  '(213) 854-5800',
  'https://tabernaculola.net/wp-content/uploads/2019/10/New-Full-Color-470.png'
)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can read organization settings" on public.organization_settings;
drop policy if exists "Only admins can insert organization settings" on public.organization_settings;
drop policy if exists "Only admins can update organization settings" on public.organization_settings;
drop policy if exists "Only admins can delete organization settings" on public.organization_settings;

create policy "Authenticated users can read organization settings"
on public.organization_settings
for select
to authenticated
using (true);

create policy "Only admins can insert organization settings"
on public.organization_settings
for insert
to authenticated
with check (app_private.is_admin());

create policy "Only admins can update organization settings"
on public.organization_settings
for update
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create policy "Only admins can delete organization settings"
on public.organization_settings
for delete
to authenticated
using (app_private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-assets',
  'organization-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view organization assets" on storage.objects;
drop policy if exists "Only admins can upload organization assets" on storage.objects;
drop policy if exists "Only admins can replace organization assets" on storage.objects;
drop policy if exists "Only admins can delete organization assets" on storage.objects;

create policy "Anyone can view organization assets"
on storage.objects
for select
to public
using (bucket_id = 'organization-assets');

create policy "Only admins can upload organization assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'organization-assets'
  and app_private.is_admin()
);

create policy "Only admins can replace organization assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'organization-assets'
  and app_private.is_admin()
)
with check (
  bucket_id = 'organization-assets'
  and app_private.is_admin()
);

create policy "Only admins can delete organization assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'organization-assets'
  and app_private.is_admin()
);
