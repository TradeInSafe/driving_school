-- Database Schema for Brisbane Bayside Driving School (Idempotent Version)

-- 1. Users Table — independent of Supabase auth, server-side sessions only
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  password_hash text,                          -- null for Google-only accounts
  google_id text unique,                       -- Google OAuth subject identifier
  full_name text,
  phone text,
  address text,
  gender text,
  license_number text,
  license_expiry date,
  credits_remaining integer default 0,
  package_expiry timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add new student profile columns if not present (for existing DBs)
alter table public.users add column if not exists gender text;
alter table public.users add column if not exists license_number text;
alter table public.users add column if not exists license_expiry date;

alter table public.users enable row level security;
-- All access goes through service role API routes; no direct client access
drop policy if exists "No public access to users." on public.users;
create policy "No public access to users." on public.users for select using (false);

-- 1b. Profiles Table — kept for backward compatibility (legacy, no longer used for auth)
create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  avatar_url text,
  phone text,
  address text,
  credits_remaining integer default 0,
  package_expiry timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Drop old role-dependent RLS policies before dropping the column (migration)
drop policy if exists "Admins can view all inquiries." on public.inquiries;
drop policy if exists "Instructors can view all inquiries." on public.inquiries;
drop policy if exists "Admins can update settings." on public.settings;
drop policy if exists "Admins can upload assets." on storage.objects;
drop policy if exists "Admins can update assets." on storage.objects;
drop policy if exists "Admins can delete assets." on storage.objects;
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'driving_packages') then
    drop policy if exists "Admins can manage driving packages." on public.driving_packages;
  end if;
end $$;

-- Drop instructor/role columns if they exist (migrating from old schema)
alter table public.profiles drop column if exists role;
alter table public.profiles drop column if exists bio;
alter table public.profiles drop column if exists rating;
alter table public.profiles drop column if exists experience_years;
alter table public.profiles drop column if exists car_model;
alter table public.profiles drop column if exists languages;

-- Add package-related columns if they don't exist (for older DBs that haven't run the new CREATE TABLE)
alter table public.profiles add column if not exists credits_remaining integer default 0;
alter table public.profiles add column if not exists package_expiry timestamp with time zone;

-- 1b. Admin Users Table — stores admin accounts (separate from student profiles)
create table if not exists public.admin_users (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.admin_users enable row level security;
-- Admin users table is managed exclusively via service role key; no public access
drop policy if exists "No public access to admin_users." on public.admin_users;
create policy "No public access to admin_users." on public.admin_users for select using (false);

-- Enable RLS
alter table public.profiles enable row level security;

-- 2. Lessons Table
create table if not exists public.lessons (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  duration_minutes integer not null,
  price decimal(10, 2) not null,
  is_active boolean default true,
  is_package boolean default false,
  lesson_count integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add package columns to existing tables that predate this migration
alter table public.lessons add column if not exists is_package boolean default false;
alter table public.lessons add column if not exists lesson_count integer default 1;

alter table public.lessons enable row level security;

-- Public can read active lessons; all writes go through service role API routes
drop policy if exists "Lessons are viewable by everyone." on public.lessons;
create policy "Lessons are viewable by everyone." on public.lessons for select using (true);

-- 3. Instructors Table (admin-managed, independent of auth users)
create table if not exists public.instructors (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text,
  phone text,
  bio text,
  experience_years integer default 0,
  car_model text,
  languages text[] default '{English}',
  rating numeric default 5.0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.instructors enable row level security;

drop policy if exists "Instructors are viewable by everyone." on public.instructors;
create policy "Instructors are viewable by everyone." on public.instructors for select using (true);

-- 4. Bookings Table
create table if not exists public.bookings (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.users(id) not null,
  instructor_id uuid references public.instructors(id) not null,
  lesson_id uuid references public.lessons(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text check (status in ('scheduled', 'completed', 'cancelled', 'rescheduled')) default 'scheduled',
  payment_status text check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'pay_in_person')) default 'pending',
  pickup_address text,
  vehicle_type text check (vehicle_type in ('car', 'truck')) default 'car',
  transmission_type text check (transmission_type in ('auto', 'manual')) default 'auto',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add credits_used column if it doesn't exist
alter table public.bookings add column if not exists credits_used integer default 0;

-- bundle_id groups multi-slot package bookings made in one purchase
alter table public.bookings add column if not exists bundle_id uuid;

-- Migrate bookings.instructor_id FK from profiles to instructors (if still pointing at profiles)
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
    join information_schema.referential_constraints rc on tc.constraint_name = rc.constraint_name
    join information_schema.table_constraints tc2 on rc.unique_constraint_name = tc2.constraint_name
    where tc.table_name = 'bookings'
      and kcu.column_name = 'instructor_id'
      and tc2.table_name = 'profiles'
  ) then
    alter table public.bookings drop constraint bookings_instructor_id_fkey;
    alter table public.bookings add constraint bookings_instructor_id_fkey
      foreign key (instructor_id) references public.instructors(id);
  end if;
end $$;

alter table public.bookings enable row level security;

-- 5. Availability Table
create table if not exists public.availability (
  id uuid default gen_random_uuid() primary key,
  instructor_id uuid references public.instructors(id) on delete cascade not null,
  day_of_week integer check (day_of_week between 0 and 6) not null, -- 0 is Sunday
  start_time time not null,
  end_time time not null,
  is_active boolean default true
);

-- Migrate availability.instructor_id FK from profiles to instructors (if still pointing at profiles)
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
    join information_schema.referential_constraints rc on tc.constraint_name = rc.constraint_name
    join information_schema.table_constraints tc2 on rc.unique_constraint_name = tc2.constraint_name
    where tc.table_name = 'availability'
      and kcu.column_name = 'instructor_id'
      and tc2.table_name = 'profiles'
  ) then
    alter table public.availability drop constraint availability_instructor_id_fkey;
    alter table public.availability add constraint availability_instructor_id_fkey
      foreign key (instructor_id) references public.instructors(id) on delete cascade;
  end if;
end $$;

alter table public.availability enable row level security;

drop policy if exists "Availability is viewable by everyone." on public.availability;
create policy "Availability is viewable by everyone." on public.availability for select using (true);

-- 5. Package Purchases Table
create table if not exists public.package_purchases (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.users(id) not null,
  package_type text not null, -- '5-pack', '10-pack'
  amount numeric not null,
  credits_added integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Package Purchases
alter table public.package_purchases enable row level security;

-- 6. Auth trigger removed — users are now managed via public.users table (server-side auth)
drop trigger if exists on_auth_user_created on auth.users;

-- RPC for incrementing credits and updating expiry (now targets users table)
create or replace function public.increment_student_credits(p_student_id uuid, p_credits integer, p_expiry timestamp with time zone)
returns void as $$
begin
  update public.users
  set
    credits_remaining = coalesce(credits_remaining, 0) + p_credits,
    package_expiry = p_expiry
  where id = p_student_id;
end;
$$ language plpgsql security definer;

-- Policies for Bookings — all access via service role API routes, no direct client access
drop policy if exists "Users can view own bookings." on public.bookings;
drop policy if exists "Students can create bookings." on public.bookings;

-- Policies for Package Purchases — all access via service role API routes
drop policy if exists "Users can view own purchases." on public.package_purchases;

-- Policies for Lessons
drop policy if exists "Lessons are viewable by everyone." on public.lessons;
create policy "Lessons are viewable by everyone." on public.lessons for select using (true);

-- Seed Initial Lessons (only if they don't exist by title)
insert into public.lessons (title, description, duration_minutes, price)
select 'Single Lesson', '60 minutes intensive one-on-one session.', 60, 75.00
where not exists (select 1 from public.lessons where title = 'Single Lesson');

insert into public.lessons (title, description, duration_minutes, price)
select 'Introductory Lesson', 'Perfect for your first time with us.', 60, 49.00
where not exists (select 1 from public.lessons where title = 'Introductory Lesson');

insert into public.lessons (title, description, duration_minutes, price)
select 'Extended Session', 'Double time for faster progress.', 120, 135.00
where not exists (select 1 from public.lessons where title = 'Extended Session');

insert into public.lessons (title, description, duration_minutes, price, is_package, lesson_count)
select '5 Lesson Pack', 'Save with a bundle of 5 lessons. Must be used within 90 days.', 300, 350.00, true, 5
where not exists (select 1 from public.lessons where title = '5 Lesson Pack');

insert into public.lessons (title, description, duration_minutes, price, is_package, lesson_count)
select '10 Lesson Pack', 'Best value bundle for consistent progress. Must be used within 90 days.', 600, 650.00, true, 10
where not exists (select 1 from public.lessons where title = '10 Lesson Pack');

-- [2026-04-05] Fix existing pack lessons that were seeded before is_package was introduced
update public.lessons set is_package = true, lesson_count = 5  where title = '5 Lesson Pack'  and is_package = false;
update public.lessons set is_package = true, lesson_count = 10 where title = '10 Lesson Pack' and is_package = false;

-- Driving packages table removed — lessons table serves this purpose
drop table if exists public.driving_packages;

-- 8. Inquiries Table
create table if not exists public.inquiries (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text not null,
  phone text,
  interest text, -- e.g. 'Standard Lessons', 'Package Deals'
  message text,
  status text check (status in ('new', 'contacted', 'resolved')) default 'new',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.inquiries enable row level security;
-- Inquiry reads are admin-only via service role API routes; students can only submit
drop policy if exists "Admins can view all inquiries." on public.inquiries;
drop policy if exists "Instructors can view all inquiries." on public.inquiries;
drop policy if exists "Public can create inquiries." on public.inquiries;
create policy "Public can create inquiries." on public.inquiries for insert with check (true);

-- 8. Settings Table
create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.settings enable row level security;

drop policy if exists "Settings are viewable by everyone." on public.settings;
create policy "Settings are viewable by everyone." on public.settings for select using (true);

-- Settings writes go through service role API routes; no client-side admin writes
drop policy if exists "Admins can update settings." on public.settings;

-- Insert initial logo
insert into public.settings (key, value) values ('logo_url', '') on conflict do nothing;

-- Instructor travel buffer between bookings (minutes)
insert into public.settings (key, value) values ('instructor_buffer_mins', '30') on conflict do nothing;

-- 8. Storage bucket for assets
insert into storage.buckets (id, name, public) values ('assets', 'assets', true) on conflict do nothing;

drop policy if exists "Assets are publicly accessible." on storage.objects;
create policy "Assets are publicly accessible." on storage.objects for select using ( bucket_id = 'assets' );

-- Storage writes go through service role API routes; no client-side admin writes
drop policy if exists "Admins can upload assets." on storage.objects;
drop policy if exists "Admins can update assets." on storage.objects;
drop policy if exists "Admins can delete assets." on storage.objects;

-- ─── Migrations ────────────────────────────────────────────────────────────────

-- [2026-04-03] Copy existing Supabase auth users into public.users (preserves IDs so FKs stay valid)
-- Pulls email from auth.users and profile data from public.profiles
do $$
declare
  r record;
begin
  for r in
    select au.id, au.email, p.full_name, p.phone, p.address,
           coalesce(p.credits_remaining, 0) as credits_remaining,
           p.package_expiry, au.created_at
    from auth.users au
    left join public.profiles p on p.id = au.id
    where au.id not in (select id from public.users)
      and au.email not in (select email from public.users)
  loop
    begin
      insert into public.users (id, email, full_name, phone, address, credits_remaining, package_expiry, created_at)
      values (r.id, r.email, r.full_name, r.phone, r.address, r.credits_remaining, r.package_expiry, r.created_at);
    exception when unique_violation then
      -- skip rows that conflict on any unique column
      null;
    end;
  end loop;
end $$;

-- [2026-04-03] Migrate bookings.student_id FK from profiles to users
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
    join information_schema.referential_constraints rc on tc.constraint_name = rc.constraint_name
    join information_schema.table_constraints tc2 on rc.unique_constraint_name = tc2.constraint_name
    where tc.table_name = 'bookings'
      and kcu.column_name = 'student_id'
      and tc2.table_name = 'profiles'
  ) then
    alter table public.bookings drop constraint bookings_student_id_fkey;
    alter table public.bookings add constraint bookings_student_id_fkey
      foreign key (student_id) references public.users(id);
  end if;
end $$;

-- [2026-04-03] Migrate package_purchases.student_id FK from profiles to users
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
    join information_schema.referential_constraints rc on tc.constraint_name = rc.constraint_name
    join information_schema.table_constraints tc2 on rc.unique_constraint_name = tc2.constraint_name
    where tc.table_name = 'package_purchases'
      and kcu.column_name = 'student_id'
      and tc2.table_name = 'profiles'
  ) then
    alter table public.package_purchases drop constraint package_purchases_student_id_fkey;
    alter table public.package_purchases add constraint package_purchases_student_id_fkey
      foreign key (student_id) references public.users(id);
  end if;
end $$;

-- [2026-04-02] Add 'pay_in_person' and 'failed' to bookings.payment_status
do $$ begin
  alter table public.bookings
    drop constraint if exists bookings_payment_status_check;
  alter table public.bookings
    add constraint bookings_payment_status_check
    check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'pay_in_person'));
end $$;

-- [2026-04-03] Add vehicle_type column to bookings
alter table public.bookings add column if not exists vehicle_type text check (vehicle_type in ('car', 'truck')) default 'car';

-- [2026-04-05] Add bundle_id to group multi-slot package bookings made in one purchase
alter table public.bookings add column if not exists bundle_id uuid;

-- [2026-04-03] Prevent double-booking at DB level using exclusion constraint on tstzrange
-- Requires btree_gist extension (available on all Supabase projects)
create extension if not exists btree_gist;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_no_instructor_overlap'
  ) then
    alter table public.bookings
      add constraint bookings_no_instructor_overlap
      exclude using gist (
        instructor_id with =,
        tstzrange(start_time, end_time, '[)') with &&
      ) where (status = 'scheduled');
  end if;
end $$;

-- [2026-04-06] Add photo_url to instructors
alter table public.instructors add column if not exists photo_url text;

-- [2026-04-08] Fix availability slots seeded with 06:00 — standardise to 07:00
update public.availability set start_time = '07:00' where start_time < '07:00';

-- [2026-04-10] Vehicle Hire for Test
create table if not exists public.vehicle_hires (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  vehicle_type text check (vehicle_type in ('car', 'truck')) not null default 'car',
  duration_minutes integer not null default 60,
  price decimal(10, 2) not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.vehicle_hires enable row level security;
drop policy if exists "Vehicle hires are viewable by everyone." on public.vehicle_hires;
create policy "Vehicle hires are viewable by everyone." on public.vehicle_hires for select using (true);

-- Allow hire_id on bookings (lesson_id and instructor_id become optional for hire bookings)
alter table public.bookings add column if not exists hire_id uuid references public.vehicle_hires(id);
alter table public.bookings add column if not exists needs_instructor boolean default false;
alter table public.bookings alter column lesson_id drop not null;
alter table public.bookings alter column instructor_id drop not null;

-- [2026-04-13] Date-specific availability (replaces recurring day_of_week for new entries)
-- specific_date stores the exact calendar date; day_of_week kept for backward-compat with old rows.
alter table public.availability add column if not exists specific_date date;
alter table public.availability alter column day_of_week drop not null;

-- [2026-04-13] Availability type: 'available' (default) or 'blocked' (not-available override)
alter table public.availability add column if not exists type text default 'available' check (type in ('available', 'blocked'));
