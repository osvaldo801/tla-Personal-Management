alter table public.server_profiles
  add column if not exists baptism_status text,
  add column if not exists profession_year text,
  add column if not exists membership_since_year text,
  add column if not exists membership_classes text,
  add column if not exists service_availability text,
  add column if not exists skills_talents text,
  add column if not exists service_ministries text;
