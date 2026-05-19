-- Align legacy Supabase installs with Drizzle multi-tenant schema used by the API.
-- Safe to run multiple times (IF NOT EXISTS / conditional alters).

alter table public.users add column if not exists admin_id uuid references public.users(id);
alter table public.venues add column if not exists admin_id uuid references public.users(id);
alter table public.bookings add column if not exists admin_id uuid references public.users(id);
alter table public.settings add column if not exists admin_id uuid references public.users(id);

alter table public.bookings add column if not exists tamil_date_label text;
alter table public.bookings add column if not exists phone_numbers jsonb not null default '[]'::jsonb;

-- Per-admin settings (drop global unique on key if present)
do $$
begin
  alter table public.settings drop constraint if exists settings_key_key;
exception
  when undefined_object then null;
end $$;

create unique index if not exists settings_admin_key_unique
  on public.settings (admin_id, key)
  where admin_id is not null;
