-- Hotfix for existing databases created before venue_category/amenities changes.
-- Run this in Supabase SQL Editor once.

create extension if not exists "uuid-ossp";

alter table public.venues add column if not exists venue_category text not null default 'other';
alter table public.venues add column if not exists amenities jsonb not null default '[]';
alter table public.venues add column if not exists color_tag text default '#C75B2A';
alter table public.venues add column if not exists updated_at timestamp with time zone default now();

alter table public.booking_pdfs add column if not exists storage_path text;
alter table public.booking_pdfs add column if not exists public_url text;

create table if not exists public.refresh_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  device_name text,
  last_used_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_refresh_tokens_user on public.refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_token on public.refresh_tokens(token);

-- Keep seed insert compatible if table already had rows
insert into public.venues (name, type, venue_category, price_per_hour) values
('Main Mahal', 'mahal', 'mahal', 5000.00),
('AC Room 1', 'room', 'ac_room', 500.00),
('AC Room 2', 'room', 'ac_room', 500.00),
('Dining Hall', 'mahal', 'dining_hall', 2000.00)
on conflict do nothing;
