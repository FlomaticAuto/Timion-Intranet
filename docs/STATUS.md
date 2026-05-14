# Project status

Snapshot of where Timion Intranet is right now. Updated when state of deployment, users, or features changes.

**Last updated:** 2026-05-15 (session 3)

## Deployment

- **Hosted on:** Vercel (auto-deploys from `main` branch)
- **Repo:** <https://github.com/FlomaticAuto/Timion-Intranet>
- **Supabase project:** `Timion_Intranet` · ref `oalbsyjugkxzooijendz` · region `eu-west-1`
- **Production URL:** Vercel default (custom domain pending — see BACKLOG.md)
- **Required env vars (Vercel):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GITHUB_SYNC_TOKEN` (PAT with Actions read/write on this repo — powers the ↺ Sync button)

## What's live

### Intranet shell
- Home page (`/`) — welcome strip + hero grid linking to each section
- 9 sticky tabs: Home, CRM, Inventory, Books, Workshop, **HR** (new), ISO / Compliance, Documents, Board & Reporting, Admin (admin-only)
- Site header with logo, version pill, user menu (avatar + name + role + sign-out)
- Site footer

### Sections — landing pages with tile grids
All exist with appropriate tiles. Live tiles:
- **CRM** — Zoho CRM link, **Visit Dashboard**, **Order Process Dashboard** (both live internal routes)
- **Inventory** — Zoho Inventory link, **Production Dashboard** (live internal route)
- **Books** — Zoho Books link
- **HR** — 4 comingSoon tiles: Leave Requests, Leave Approvals, Leave Dashboard, Staff Profile
- **Board & Reporting** — Timion Presentation, Annual Report 2026 PDF (both static files in `/public/`)

Tile naming convention: live internal dashboards use "Dashboard" suffix; future report/history views will use "Report".

Everything else is `Coming Soon` placeholders for future work.

### Production Dashboard (`/inventory/production-dashboard`)
Native Next.js route inside the intranet shell. Pulls JSON from `public/data/*.json`. Cards show assembly number, item, qty, staff, serials, status, and a ↗ deep-link to the assembly in Zoho Inventory. See "Sync schedule" section below for timing. `fetch_zoho.py` now exports `bundle_id` as `id` — first sync after session 3 will populate the links.

### Visit Dashboard (`/crm/visit-report`)
Native Next.js route. Pulls JSON from `public/data/crm/*.json`. Monthly view (4 summary chips + card grid) and Analytics view (KPIs, trend charts, rankings by therapist / visit type / location). Data from **December 2025** onwards. Cards show: visit number (title), patient name, date, therapist, location, visit type, and a ↗ deep-link to the record in Zoho CRM (`CustomModule4/{id}`).

**Field API names in use:** `Name` (visit number), `Patient_Name` (patient — lookup to Accounts/Patients), `Date`, `Staff_2` (therapist), `Type` (visit type), `Location`.

**Note:** `visit_number` and `patient` were added in session 3 — run workflow_dispatch with `crm_all_months: true` to backfill older months.

### Order Process Dashboard (`/crm/order-process`)
Native Next.js route. Pulls JSON from `public/data/crm/orders.json`. Three views: Pipeline (stage grid + order-type breakdown), Orders (filterable table), Trends (bar charts).

- **Data:** all Deals from the Orders Process module with `Created_Time >= 2026-03-01`
- **Filters:** search, type, stage, referral source, year + month (defaults to current month)
- **Columns:** Order Name, Customer, Type, Stage, Referral Source, Created Date, Closing Date, ↗ CRM link
- **Script:** `scripts/fetch_zoho_crm_orders.py` — fetches Deal fields only. No `order_date` from Equipment History; Zoho CRM v2 multi-lookup fields are inaccessible without COQL scope.
- **Deal fields fetched:** `id`, `Deal_Name`, `Account_Name`, `Order_Type`, `Stage`, `Lead_Source`, `Closing_Date`, `Created_Time`

### Sync schedule and manual trigger
All three dashboards sync in one workflow run:
- **Automatic:** `0 9,15 * * 1-5` = **11:00 + 17:00 SAST, Mon–Fri**
- **Manual:** ↺ Sync button on each dashboard subheader → `POST /api/sync` → dispatches `sync-zoho.yml` via GitHub Actions API. Requires `GITHUB_SYNC_TOKEN` Vercel env var (fine-grained PAT, Actions read/write on this repo).

### CRM data pipeline notes
- Separate Zoho Self Client OAuth app (`ZohoCRM.modules.ALL.READ`). GitHub secrets: `ZOHO_CRM_CLIENT_ID`, `ZOHO_CRM_CLIENT_SECRET`, `ZOHO_CRM_REFRESH_TOKEN`.
- Zoho CRM `Date` fields reject all comparison operators in `/search` criteria — fetch-all + Python filter is the workaround.
- Zoho CRM multi-lookup fields are completely inaccessible via standard GET, related-records endpoint, or search criteria. Requires `ZohoCRM.coql.READ` scope (not yet added).

### Zoho deep-links (all dashboards)
- **Visit cards** → `https://one.zoho.com/…/tab/CustomModule4/{id}`
- **Production cards** → `https://one.zoho.com/…/inventory/app/878382704#/inventory/assembly/{id}` (needs a post-session-3 sync to get `bundle_id` into JSON)
- **Order rows** → `https://crm.zoho.com/crm/org878871386/tab/Potentials/{id}`

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
