-- MAHALBOOK MASTER SCHEMA
-- Fresh Installation Script for Supabase

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES
-- Users & Profiles
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null default 'staff', -- 'admin', 'staff'
  phone_number text,
  date_of_birth text,
  must_change_pw boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.refresh_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  device_name text,
  last_used_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Venues (Mahal, Rooms, etc.)
create table if not exists public.venues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null, -- 'mahal', 'room'
  venue_category text not null default 'other',
  amenities jsonb not null default '[]',
  color_tag text default '#C75B2A',
  price_per_hour decimal(10,2) not null default 0,
  is_active boolean default true,
  display_order integer not null default 0,
  updated_at timestamp with time zone default now()
);

-- Backfill columns when table already exists from older installs
alter table public.venues add column if not exists venue_category text not null default 'other';
alter table public.venues add column if not exists amenities jsonb not null default '[]';
alter table public.venues add column if not exists color_tag text default '#C75B2A';
alter table public.venues add column if not exists updated_at timestamp with time zone default now();

-- Bookings
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  booking_ref text unique not null, -- e.g., MBK-2026-0001
  customer_name text not null,
  phone_numbers jsonb not null default '[]',
  address text,
  id_proof_url text,
  booking_date text not null,
  tamil_date_label text,
  start_time text not null,
  end_time text not null,
  duration_hours decimal(5,2) not null,
  total_amount decimal(12,2) not null,
  advance_amount decimal(12,2) not null default 0,
  is_paid boolean not null default false,
  notes text,
  status text not null default 'confirmed', -- 'confirmed', 'cancelled', 'completed'
  created_by_id uuid references public.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  cancelled_at timestamp with time zone,
  cancelled_by_id uuid references public.users(id),
  cancel_reason text
);

-- Junction table for multiple venues in one booking
create table if not exists public.booking_venues (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete cascade,
  venue_id uuid references public.venues(id),
  price_per_hour decimal(10,2) not null,
  subtotal decimal(12,2) not null
);

-- PDF Cache & Metadata
create table if not exists public.booking_pdfs (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete cascade,
  file_name text not null,
  pdf_data text not null,
  storage_path text,
  public_url text,
  file_size integer not null,
  created_at timestamp with time zone default now()
);

-- Backfill columns when table already exists from older installs
alter table public.booking_pdfs add column if not exists storage_path text;
alter table public.booking_pdfs add column if not exists public_url text;

-- Business Settings
create table if not exists public.settings (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value text not null,
  updated_at timestamp with time zone default now()
);

-- 3. STORAGE SETUP
-- Create the 'pdfs' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;

-- 4. POLICIES (Simplified for Admin/Staff Access)
alter table public.users enable row level security;
alter table public.bookings enable row level security;
alter table public.venues enable row level security;
alter table public.booking_venues enable row level security;
alter table public.booking_pdfs enable row level security;
alter table public.settings enable row level security;

drop policy if exists "Allow all for authenticated" on public.users;
drop policy if exists "Allow all for authenticated" on public.bookings;
drop policy if exists "Allow all for authenticated" on public.venues;
drop policy if exists "Allow all for authenticated" on public.booking_venues;
drop policy if exists "Allow all for authenticated" on public.booking_pdfs;
drop policy if exists "Allow all for authenticated" on public.settings;

create policy "users_read_authenticated" on public.users
for select to authenticated using (true);
create policy "users_admin_write" on public.users
for all to authenticated
using ((auth.jwt() ->> 'role') = 'admin')
with check ((auth.jwt() ->> 'role') = 'admin');

create policy "bookings_read_authenticated" on public.bookings
for select to authenticated using (true);
create policy "bookings_admin_write" on public.bookings
for all to authenticated
using ((auth.jwt() ->> 'role') = 'admin')
with check ((auth.jwt() ->> 'role') = 'admin');

create policy "venues_read_authenticated" on public.venues
for select to authenticated using (true);
create policy "venues_admin_write" on public.venues
for all to authenticated
using ((auth.jwt() ->> 'role') = 'admin')
with check ((auth.jwt() ->> 'role') = 'admin');

create policy "booking_venues_read_authenticated" on public.booking_venues
for select to authenticated using (true);
create policy "booking_venues_admin_write" on public.booking_venues
for all to authenticated
using ((auth.jwt() ->> 'role') = 'admin')
with check ((auth.jwt() ->> 'role') = 'admin');

create policy "booking_pdfs_read_authenticated" on public.booking_pdfs
for select to authenticated using (true);
create policy "booking_pdfs_admin_write" on public.booking_pdfs
for all to authenticated
using ((auth.jwt() ->> 'role') = 'admin')
with check ((auth.jwt() ->> 'role') = 'admin');

create policy "settings_read_authenticated" on public.settings
for select to authenticated using (true);
create policy "settings_admin_write" on public.settings
for all to authenticated
using ((auth.jwt() ->> 'role') = 'admin')
with check ((auth.jwt() ->> 'role') = 'admin');

-- Storage Policies for 'pdfs' bucket
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Admin Uploads" on storage.objects;
drop policy if exists "Admin Updates" on storage.objects;

create policy "Authenticated PDF Read" on storage.objects
for select to authenticated
using (bucket_id = 'pdfs');
create policy "Admin PDF Insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'pdfs' and (auth.jwt() ->> 'role') = 'admin');
create policy "Admin PDF Update" on storage.objects
for update to authenticated
using (bucket_id = 'pdfs' and (auth.jwt() ->> 'role') = 'admin')
with check (bucket_id = 'pdfs' and (auth.jwt() ->> 'role') = 'admin');

-- 5. SEED DATA
insert into public.venues (name, type, venue_category, price_per_hour) values
('Main Mahal', 'mahal', 'mahal', 5000.00),
('AC Room 1', 'room', 'ac_room', 500.00),
('AC Room 2', 'room', 'ac_room', 500.00),
('Dining Hall', 'mahal', 'dining_hall', 2000.00)
on conflict do nothing;

-- Default Business Settings
insert into public.settings (key, value) values 
('biz_name', 'MahalBook Venue'),
('biz_tagline', 'Excellence in Event Hosting'),
('biz_address', '123 Main Street, Tamil Nadu'),
('biz_phone', '+91 98765 43210'),
('biz_email', 'contact@mahalbook.app'),
('biz_gst', '33AAAAA0000A1Z5')
on conflict (key) do nothing;

-- Performance indexes
create index if not exists idx_bookings_date on public.bookings(booking_date);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_customer on public.bookings(customer_name);
create index if not exists idx_bookings_created_by on public.bookings(created_by_id);
create index if not exists idx_bookings_date_status on public.bookings(booking_date, status);
create index if not exists idx_booking_venues_booking on public.booking_venues(booking_id);
create index if not exists idx_booking_venues_venue on public.booking_venues(venue_id);
create index if not exists idx_booking_pdfs_booking on public.booking_pdfs(booking_id);
create index if not exists idx_bookings_phones on public.bookings using gin(phone_numbers);
create index if not exists idx_refresh_tokens_user on public.refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_token on public.refresh_tokens(token);

-- Auto-update updated_at timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

drop trigger if exists set_updated_at_bookings on public.bookings;
create trigger set_updated_at_bookings
before update on public.bookings
for each row execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_venues on public.venues;
create trigger set_updated_at_venues
before update on public.venues
for each row execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_users on public.users;
create trigger set_updated_at_users
before update on public.users
for each row execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_settings on public.settings;
create trigger set_updated_at_settings
before update on public.settings
for each row execute function public.update_updated_at_column();
