-- ──────────────────────────────────────────────────────────────────
-- Timion Intranet — dynamic access policy storage
--
-- Stores app-wide settings as JSONB rows. First setting is the
-- role × section access policy, replacing the hardcoded matrix in
-- lib/permissions.ts. Admins edit it from /admin/access; everyone
-- else can read it.
--
-- Applied via the Supabase MCP `apply_migration` on first run; this
-- file is the canonical record in the repo. Idempotent — safe to
-- re-run.
-- ──────────────────────────────────────────────────────────────────

create table if not exists public.app_settings (
  id         text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Auto-bump updated_at on every update.
create or replace function public.touch_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_settings_touch_updated_at on public.app_settings;
create trigger app_settings_touch_updated_at
  before update on public.app_settings
  for each row execute function public.touch_app_settings_updated_at();

-- RLS: authenticated read, admin write.
alter table public.app_settings enable row level security;

drop policy if exists "Settings: authenticated read" on public.app_settings;
create policy "Settings: authenticated read"
  on public.app_settings for select
  to authenticated
  using (true);

drop policy if exists "Settings: admin insert" on public.app_settings;
create policy "Settings: admin insert"
  on public.app_settings for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Settings: admin update" on public.app_settings;
create policy "Settings: admin update"
  on public.app_settings for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Settings: admin delete" on public.app_settings;
create policy "Settings: admin delete"
  on public.app_settings for delete
  to authenticated
  using (public.is_admin());

-- Seed: initial access policy matching DEFAULT_SECTION_ACCESS in
-- lib/permissions.ts. No-op if a row already exists.
insert into public.app_settings (id, value)
values (
  'access_policy',
  '{
    "admin":              {"/":"full","/crm":"full","/inventory":"full","/books":"full","/workshop":"full","/iso":"full","/documents":"full","/board":"full","/admin":"full"},
    "management":         {"/":"full","/crm":"full","/inventory":"full","/books":"full","/workshop":"full","/iso":"full","/documents":"full","/board":"full"},
    "production_manager": {"/":"full","/inventory":"full","/workshop":"full","/documents":"read"},
    "carpenter":          {"/":"full","/workshop":"full","/inventory":"read","/documents":"read"},
    "therapist":          {"/":"full","/crm":"scoped","/documents":"read"},
    "office":             {"/":"full","/books":"read","/iso":"full","/documents":"full"},
    "auditor":            {"/":"full","/iso":"scoped","/documents":"read"},
    "board":              {"/":"full","/board":"full","/documents":"read"}
  }'::jsonb
)
on conflict (id) do nothing;
