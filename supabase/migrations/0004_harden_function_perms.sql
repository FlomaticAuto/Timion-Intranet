-- ──────────────────────────────────────────────────────────────────
-- Timion Intranet — harden helper function permissions
--
-- Addresses three warnings from the Supabase security advisor:
--
-- 1. `touch_updated_at` and `touch_app_settings_updated_at` had a
--    mutable search_path. Lock to `public`.
--
-- 2. `handle_new_user` was callable by anon and authenticated roles
--    as an RPC endpoint. It should only fire as the trigger on
--    auth.users. Revoke EXECUTE from everyone — triggers fire
--    regardless of EXECUTE grants.
--
-- 3. `is_admin` was callable by anon. Revoke. Keep EXECUTE for the
--    authenticated role since RLS policies call it.
--
-- Applied via Supabase MCP `apply_migration`. Idempotent.
-- ──────────────────────────────────────────────────────────────────

alter function public.touch_updated_at()
  set search_path = public;

alter function public.touch_app_settings_updated_at()
  set search_path = public;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

revoke all on function public.is_admin() from anon;
