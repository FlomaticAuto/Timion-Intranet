-- ──────────────────────────────────────────────────────────────────
-- Timion Intranet — initial auth schema
-- One-time setup. Paste into Supabase → SQL Editor → Run.
-- ──────────────────────────────────────────────────────────────────

-- Role enum
create type public.user_role as enum (
  'admin',
  'management',
  'production_manager',
  'carpenter',
  'therapist',
  'office',
  'auditor',
  'board'
);

-- Profiles — one row per auth user, joined by id.
-- role starts as NULL so a fresh user has no privileges until an
-- admin assigns one.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text,
  role        public.user_role,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at in sync.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ── Row Level Security ────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Any logged-in user can read their own profile.
create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Admins can read every profile.
create policy "Admins read all profiles"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update any profile (assign roles, toggle is_active, etc.).
create policy "Admins update all profiles"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Users can update their own non-privileged fields (full_name only).
-- Role and is_active stay admin-only.
create policy "Users update own non-privileged fields"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role is not distinct from (select role from public.profiles where id = auth.uid())
    and is_active is not distinct from (select is_active from public.profiles where id = auth.uid())
  );
