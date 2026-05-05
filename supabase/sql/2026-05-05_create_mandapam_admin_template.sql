-- Template: create one mandapam admin account directly in Supabase Postgres.
-- Usage:
-- 1) Replace the values in the input CTE.
-- 2) Run in Supabase SQL editor.
-- 3) Share email/password with admin and force password change on first login.

create extension if not exists pgcrypto;

with input as (
  select
    'Mandapam Admin - Pollachi'::text as full_name,
    'pollachi-admin@bookal.app'::text as email,
    'ChangeMe@123'::text as plain_password
),
upsert_admin as (
  insert into users (
    full_name,
    email,
    password_hash,
    role,
    is_active,
    must_change_pw,
    admin_id,
    created_at,
    updated_at
  )
  select
    i.full_name,
    lower(trim(i.email)),
    crypt(i.plain_password, gen_salt('bf', 12)),
    'admin',
    true,
    true,
    null, -- set to self after insert
    now(),
    now()
  from input i
  on conflict (email) do update
    set
      full_name = excluded.full_name,
      password_hash = excluded.password_hash,
      role = 'admin',
      is_active = true,
      must_change_pw = true,
      updated_at = now()
  returning id
)
update users u
set admin_id = u.id, updated_at = now()
from upsert_admin a
where u.id = a.id;

-- Optional sanity check:
-- select id, full_name, email, role, is_active, must_change_pw, admin_id from users where email = 'pollachi-admin@bookal.app';
