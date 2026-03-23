-- Database Schema for Brisbane Bayside Driving School (Idempotent Version)

-- 1. Profiles Table (Ensure columns exist)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  role text check (role in ('student', 'instructor', 'admin')) default 'student',
  phone text,
  address text,
  bio text,
  rating numeric default 5.0,
  experience_years integer default 0,
  car_model text,
  languages text[] default '{English}',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add package-related columns if they don't exist
alter table public.profiles add column if not exists credits_remaining integer default 0;
alter table public.profiles add column if not exists package_expiry timestamp with time zone;

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
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Bookings Table
create table if not exists public.bookings (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.profiles(id) not null,
  instructor_id uuid references public.profiles(id) not null,
  lesson_id uuid references public.lessons(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text check (status in ('scheduled', 'completed', 'cancelled', 'rescheduled')) default 'scheduled',
  payment_status text check (payment_status in ('pending', 'paid', 'refunded')) default 'pending',
  pickup_address text,
  transmission_type text check (transmission_type in ('auto', 'manual')) default 'auto',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add credits_used column if it doesn't exist
alter table public.bookings add column if not exists credits_used integer default 0;

-- 4. Availability Table
create table if not exists public.availability (
  id uuid default gen_random_uuid() primary key,
  instructor_id uuid references public.profiles(id) not null,
  day_of_week integer check (day_of_week between 0 and 6) not null, -- 0 is Sunday
  start_time time not null,
  end_time time not null,
  is_active boolean default true
);

-- 5. Package Purchases Table
create table if not exists public.package_purchases (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.profiles(id) not null,
  package_type text not null, -- '5-pack', '10-pack'
  amount numeric not null,
  credits_added integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Package Purchases
alter table public.package_purchases enable row level security;

-- 6. Automatic Profile Creation Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC for incrementing credits and updating expiry
create or replace function public.increment_student_credits(p_student_id uuid, p_credits integer, p_expiry timestamp with time zone)
returns void as $$
begin
  update public.profiles
  set 
    credits_remaining = coalesce(credits_remaining, 0) + p_credits,
    package_expiry = p_expiry
  where id = p_student_id;
end;
$$ language plpgsql security definer;

-- Policies for Profiles
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Policies for Bookings
drop policy if exists "Users can view own bookings." on public.bookings;
create policy "Users can view own bookings." on public.bookings for select using (auth.uid() = student_id or auth.uid() = instructor_id);

drop policy if exists "Students can create bookings." on public.bookings;
create policy "Students can create bookings." on public.bookings for insert with check (auth.uid() = student_id);

-- Policies for Package Purchases
drop policy if exists "Users can view own purchases." on public.package_purchases;
create policy "Users can view own purchases." on public.package_purchases for select using (auth.uid() = student_id);

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

insert into public.lessons (title, description, duration_minutes, price)
select '5 Lesson Pack', 'Save with a bundle of 5 lessons. Must be used within 90 days.', 300, 350.00
where not exists (select 1 from public.lessons where title = '5 Lesson Pack');

insert into public.lessons (title, description, duration_minutes, price)
select '10 Lesson Pack', 'Best value bundle for consistent progress. Must be used within 90 days.', 600, 650.00
where not exists (select 1 from public.lessons where title = '10 Lesson Pack');

-- 7. Inquiries Table
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
create policy "Admins can view all inquiries." on public.inquiries for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Instructors can view all inquiries." on public.inquiries for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'instructor')
);
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

drop policy if exists "Admins can update settings." on public.settings;
create policy "Admins can update settings." on public.settings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Insert initial logo
insert into public.settings (key, value) values ('logo_url', '') on conflict do nothing;

-- 8. Storage bucket for assets
insert into storage.buckets (id, name, public) values ('assets', 'assets', true) on conflict do nothing;

drop policy if exists "Assets are publicly accessible." on storage.objects;
create policy "Assets are publicly accessible." on storage.objects for select using ( bucket_id = 'assets' );

drop policy if exists "Admins can upload assets." on storage.objects;
create policy "Admins can upload assets." on storage.objects for insert with check ( 
  bucket_id = 'assets' and 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') 
);

drop policy if exists "Admins can update assets." on storage.objects;
create policy "Admins can update assets." on storage.objects for update using ( 
  bucket_id = 'assets' and 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') 
);

drop policy if exists "Admins can delete assets." on storage.objects;
create policy "Admins can delete assets." on storage.objects for delete using ( 
  bucket_id = 'assets' and 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') 
);
