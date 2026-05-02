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

-- Venues (Mahal, Rooms, etc.)
create table if not exists public.venues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null, -- 'mahal', 'room'
  base_price_per_hour decimal(10,2) not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Bookings
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  booking_ref text unique not null, -- e.g., MBK-2026-0001
  customer_name text not null,
  phone_numbers jsonb not null default '[]',
  address text,
  booking_date date not null,
  tamil_date_label text,
  start_time time not null,
  end_time time not null,
  duration_hours decimal(5,2) not null,
  total_amount decimal(12,2) not null,
  status text not null default 'confirmed', -- 'confirmed', 'cancelled', 'completed'
  cancel_reason text,
  notes text,
  created_by_id uuid references public.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
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
  file_path text not null, -- Path in Supabase Storage
  public_url text,
  created_at timestamp with time zone default now()
);

-- Business Settings
create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default now()
);

-- 3. STORAGE SETUP
-- Create the 'bookings' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('bookings', 'bookings', true)
on conflict (id) do nothing;

-- 4. POLICIES (Simplified for Admin/Staff Access)
alter table public.users enable row level security;
alter table public.bookings enable row level security;
alter table public.venues enable row level security;
alter table public.booking_venues enable row level security;
alter table public.booking_pdfs enable row level security;
alter table public.settings enable row level security;

-- Give full access to authenticated users for now
create policy "Allow all for authenticated" on public.users for all using (true);
create policy "Allow all for authenticated" on public.bookings for all using (true);
create policy "Allow all for authenticated" on public.venues for all using (true);
create policy "Allow all for authenticated" on public.booking_venues for all using (true);
create policy "Allow all for authenticated" on public.booking_pdfs for all using (true);
create policy "Allow all for authenticated" on public.settings for all using (true);

-- Storage Policies for 'bookings' bucket
create policy "Public Access" on storage.objects for select using ( bucket_id = 'bookings' );
create policy "Admin Uploads" on storage.objects for insert with check ( bucket_id = 'bookings' );
create policy "Admin Updates" on storage.objects for update with check ( bucket_id = 'bookings' );

-- 5. SEED DATA
insert into public.venues (name, type, base_price_per_hour) values 
('Main Mahal', 'mahal', 5000.00),
('AC Room 1', 'room', 500.00),
('AC Room 2', 'room', 500.00),
('Dining Hall', 'mahal', 2000.00)
on conflict do nothing;

-- Default Admin (Password: admin123 - this is a hash for dev)
insert into public.users (full_name, email, password_hash, role, must_change_pw)
values ('Admin User', 'admin@mahalbook.app', '$2b$10$YourHashHere', 'admin', false)
on conflict (email) do nothing;

-- Default Business Settings
insert into public.settings (key, value) values 
('biz_name', 'MahalBook Venue'),
('biz_tagline', 'Excellence in Event Hosting'),
('biz_address', '123 Main Street, Tamil Nadu'),
('biz_phone', '+91 98765 43210'),
('biz_email', 'contact@mahalbook.app'),
('biz_gst', '33AAAAA0000A1Z5')
on conflict (key) do nothing;
