# Project status

Snapshot of where Timion Intranet is right now. Updated when state of deployment, users, or features changes.

**Last updated:** 2026-05-13

## Deployment

- **Hosted on:** Vercel (auto-deploys from `main` branch)
- **Repo:** <https://github.com/FlomaticAuto/Timion-Intranet>
- **Supabase project:** `Timion_Intranet` · ref `oalbsyjugkxzooijendz` · region `eu-west-1`
- **Production URL:** Vercel default (custom domain pending — see BACKLOG.md)

## What's live

### Intranet shell
- Home page (`/`) — welcome strip + hero grid linking to each section
- 8 sticky tabs: Home, CRM, Inventory, Books, Workshop, ISO / Compliance, Documents, Board & Reporting, Admin (admin-only)
- Site header with logo, version pill, user menu (avatar + name + role + sign-out)
- Site footer

### Sections — landing pages with tile grids
All exist with appropriate tiles. The few **Live** tiles inside them:
- **CRM** — Zoho CRM link
- **Inventory** — Zoho Inventory link, **Production Dashboard** (live internal route)
- **Books** — Zoho Books link
- **Board & Reporting** — Timion Presentation, Annual Report 2026 PDF (both static files in `/public/`)

Everything else is `Coming Soon` placeholders for future work.

### Production Dashboard (`/inventory/production-dashboard`)
Native Next.js route inside the intranet shell. Pulls JSON from `public/data/*.json`. Scheduled GitHub Action (`.github/workflows/sync-zoho.yml`) fetches from Zoho Inventory at **09:00 + 15:00 UTC, Mon–Fri**, commits new JSON, which triggers a Vercel redeploy.

### Auth
- Email + password sign-in at `/login`
- `proxy.ts` redirects anonymous visitors to `/login` (no-op if Supabase env vars missing)
- Sign-out from header user menu
- Self-protection: admins can't change their own role / active status from `/admin/users`

### Admin panel (admin-only)
- `/admin` — hub with two tiles
- `/admin/users` — table of all profiles; inline role dropdown + active toggle; per-role count chips
- `/admin/access` — **editable** role × section matrix; click a cell to cycle Full → Read → Scoped → Hidden; optimistic updates with rollback; "last updated" timestamp; Reset-to-defaults button

## Users

- `admin@flomatic.co.za` — role `admin`, active, full name "Flomatic"
- (more to be added in Supabase Auth panel until invite-from-UI ships — see BACKLOG.md)

## Access enforcement

**Not yet active.** Every signed-in user sees every tab (except Admin, which is admin-only). The access policy at `/admin/access` is editable but doesn't yet drive `TabNav` or `proxy.ts`. Wire-up is the next planned step — see BACKLOG.md.

## Supabase migrations applied

| # | Name | What |
|---|---|---|
| 0001 | `profiles` | role enum, `profiles` table, auto-create trigger, initial RLS |
| 0002 | `fix_admin_rls` | `is_admin()` SECURITY DEFINER helper, non-recursive admin policies |
| 0003 | `access_policy_settings` | `app_settings` table for policy storage, seeded with defaults |
| 0004 | `harden_function_perms` | search_path lockdown, revoke unnecessary RPC EXECUTE |

Canonical SQL for each lives in `supabase/migrations/`. Applied via Supabase MCP `apply_migration`.

## Known outstanding warnings (Supabase advisor)

- **Leaked-password protection disabled** — recommended to flip on in Supabase → Authentication → Settings. Not blocking.
- `is_admin()` callable by authenticated role — intentional, used by RLS policies.
