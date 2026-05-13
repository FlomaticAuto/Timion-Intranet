-- ──────────────────────────────────────────────────────────────────
-- Timion Intranet — fix recursive admin RLS
--
-- 0001 created admin policies whose USING clauses queried profiles
-- from inside a policy on profiles. Postgres detects that as
-- recursive RLS evaluation and aborts the entire query — even when
-- the user is allowed by a non-recursive sibling policy.
--
-- Fix: do the admin check through a SECURITY DEFINER function that
-- runs with elevated privilege and therefore bypasses RLS on its
-- internal lookup. Rewrite the admin policies to call the function.
--
-- Idempotent — safe to re-run.
-- ──────────────────────────────────────────────────────────────────

-- 1. Helper: am I an active admin? Runs as the function owner, so
--    its lookup on public.profiles is NOT subject to RLS — no
--    recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

-- Lock the function down — only authenticated users may call it.
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. Drop the recursive policies created in 0001.
drop policy if exists "Admins read all profiles"            on public.profiles;
drop policy if exists "Admins update all profiles"          on public.profiles;
drop policy if exists "Users update own non-privileged fields" on public.profiles;

-- 3. Recreate them using the helper.
create policy "Admins read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "Admins update all profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin());

-- Note: we don't bring back "Users update own non-privileged fields"
-- yet. Self-edit isn't wired into the UI, and admins can already
-- update any profile. If we add a self-edit screen later, we'll
-- re-add a non-recursive version then.
