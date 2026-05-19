# Project status

Snapshot of where Timion Intranet is right now. Updated when state of deployment, users, or features changes.

**Last updated:** 2026-05-19 (session 11)

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
- **CRM** — Zoho CRM link, **Visit Dashboard**, **Order Process Dashboard**, **Equipment Ordered Dashboard** (all live internal routes)
- **Inventory** — Zoho Inventory link, **Sales Order Dashboard**, **Purchase Order Dashboard**, **Production Dashboard**, **Stock vs Orders Dashboard**, **Reorder Level Report** (all live internal routes)
- **Books** — Zoho Books link, **Sales Order Dashboard**, **Purchase Order Dashboard** (both live internal routes)
- **HR** — 4 comingSoon tiles: Leave Requests, Leave Approvals, Leave Dashboard, Staff Profile
- **Board & Reporting** — Timion Presentation, Annual Report 2026 PDF (both static files in `/public/`)

Tile naming convention: live internal dashboards use "Dashboard" suffix; future report/history views will use "Report".

**Tile CTA label convention (standardised session 11):**
- `live` default → **"Open dashboard"** (set in `Tile.tsx` `CTA_LABEL`)
- Reports → **"Open report"** (set explicitly via `ctaLabel` prop)
- External Zoho links → **"Open in Zoho"** (set in `Tile.tsx` `CTA_LABEL`)
- Special cases (PDF, presentation) → explicit `ctaLabel` overrides

**Sync timestamp format (standardised session 11):** All dashboards use `Last synced: DD Mon YYYY, HH:MM SAST` — produced by `toLocaleString("en-ZA", { day, month, year, hour, minute, timeZone: "Africa/Johannesburg" }) + " SAST"`. React clients have a `fmtTs(iso)` helper; vanilla-TS clients have `formatTimestamp(iso)` / `renderSynced()`.

**SyncButton position:** Always on the LEFT of the subheader row, immediately after the sync text. View toggle sits alone on the right.

Everything else is `Coming Soon` placeholders for future work.

### Production Dashboard (`/inventory/production-dashboard`)
Native Next.js route inside the intranet shell. Pulls JSON from `public/data/*.json`. Cards show assembly number, item, qty, staff, serials, status, and a ↗ deep-link to the assembly in Zoho Inventory. See "Sync schedule" section below for timing. `fetch_zoho.py` now exports `bundle_id` as `id` — first sync after session 3 will populate the links.

### Visit Dashboard (`/crm/visit-report`)
Native Next.js route. Pulls JSON from `public/data/crm/*.json`. Monthly view (4 summary chips + card grid) and Analytics view (KPIs, trend charts, rankings by therapist / visit type / location). Data from **December 2025** onwards. Cards show: visit number (title), patient name, date, therapist, location, visit type, and a ↗ deep-link to the record in Zoho CRM (`CustomModule4/{id}`).

**Field API names in use:** `Name` (visit number), `Patient_Name` (patient — lookup to Accounts/Patients), `Date`, `Staff_2` (therapist), `Type` (visit type), `Location`.

**Note:** `visit_number` and `patient` were added in session 3 — run workflow_dispatch with `crm_all_months: true` to backfill older months.

### Stock vs Orders Dashboard (`/inventory/stock-orders`)
Native Next.js route. Pulls JSON from `public/data/inventory/stock_orders.json`. Two views: Items (one row per finished item with demand, filterable by status, expandable to show which orders need it) and Orders (one row per In-Production SO with item list and CRM link).

- **Data:** 21 In-Production CRM deals → 21 matched Inventory Sales Orders → line items → finished item stock comparison
- **Status logic:** Insufficient (available < needed, shows shortfall) / At Risk (available >= needed but remaining drops below reorder level) / OK
- **Filter:** only processes line items with "(Donation) " prefix — skips service/cost lines
- **Script:** `scripts/fetch_zoho_stock_orders.py` — uses COQL for CRM deals, Inventory API for SOs + items
- Also writes `public/data/inventory/reorder.json` for the Reorder Level Report
- **Note:** This dashboard is temporary until the stock split is implemented later this year; at that point donation items will carry real stock and the name-mapping step can be removed.

### Equipment Ordered Dashboard (`/crm/equipment-issued`)
Native Next.js route. Reuses `visit-dashboard-styles.css`. Data from `Issued_Equipment` CRM module, stored in `public/data/crm/equipment/`.

- **Script:** `scripts/fetch_zoho_crm_equipment.py` — uses `ZOHO_CRM_*` credentials
- **Fields:** `Name` (record title), `Patient`, `Device_Equipment` (device), `Qty`, `Order_Date`, `Approval_Status`, `Order_from` (referral source), `Status` (mirrors linked order process stage)
- **Data:** 210 records Dec 2025–May 2026. 12,592 total records in module (all time); script caps at `FROM_MONTH = "2025-12"` and filters out future-dated records (typo year 2106 found in live data)
- **Filter toolbar:** search (patient / device / name) + Status dropdown + Approval Status dropdown; filter state persists across month navigation; chips always show full unfiltered totals
- **Status values (13):** Therapist's request, Private Sale/Government Tender, In production, Therapist's To Issue, Picked & Packed, With External Therapists - To Issue, Out With Therapist's, Ready for donation collection, On hold, Received Feedback Form, Spontaneous Issue, Issued, Canceled
- **Approval Status values (7):** Ready for Evaluation, Needs Further Information, Approved, Converted to Order, Rejected, Spontaneous Issue, Private Sale/Government Tender
- **Colour-coded badges** for both Status and Approval Status on every card (inline styles, no new CSS)
- **Analytics:** 4 KPI cards, 2 bar charts, 4 rank lists (By Device, By Status, By Approval Status, By Referral Source)
- **Deep-link:** `https://crm.zoho.com/crm/org878871386/tab/Issued_Equipment/{id}`

### Reorder Level Report (`/inventory/reorder-report`)
Native Next.js route. Pulls JSON from `public/data/inventory/reorder.json`. Shows all tracked inventory items at or approaching their reorder level.

- **Data:** 1268 items (non-donation); 327 have a reorder level configured
- **Status tiers:** Below Reorder (order immediately) / At Reorder (order now) / Approaching (≤ 1.5× reorder level) / OK
- **Filters:** keyword search, type tabs (All / Finished Items / Subassemblies / Hardware & Materials), Show All toggle (OK items hidden by default)
- **Columns:** Item, Type badge, Available (coloured by status), Reorder Level, Gap (available − reorder level)
- **Item type resolution:** `custom_fields` not returned by the list endpoint — script fetches individual item detail for each of the ~327 items with a reorder level to get `cf_item_type`. Adds ~20 s to each sync run.
- **Type distribution (current data):** 8 Finished Items, 39 Subassemblies, 1221 Hardware & Materials (of items with reorder level set)

### Order Process Dashboard (`/crm/order-process`)
Native Next.js route. Pulls JSON from `public/data/crm/orders.json`. Three views: Pipeline (stage grid + order-type breakdown), Orders (filterable table), Trends (bar charts).

- **Data:** all Deals from the Orders Process module with `Created_Time >= 2026-03-01`
- **Filters:** search, type, stage, referral source, year + month (defaults to current month)
- **Columns:** Order Name, Customer, Type, Stage, Referral Source, Created Date, Closing Date, ↗ CRM link
- **Script:** `scripts/fetch_zoho_crm_orders.py` — fetches Deal fields only. No `order_date` from Equipment History; Zoho CRM v2 multi-lookup fields are inaccessible without COQL scope.
- **Deal fields fetched:** `id`, `Deal_Name`, `Account_Name`, `Order_Type`, `Stage`, `Lead_Source`, `Closing_Date`, `Created_Time`

### Sales Order Dashboard — Books (`/books/sales-orders`) and Inventory (`/inventory/sales-orders`)
Shared client component (`SalesOrderClient`) with a `zohoBaseUrl` prop. Both pull from `public/data/salesorders.json`. Two views: Orders (filterable table) and Analytics.

- **Data:** current-year sales orders synced from Zoho. Script: `scripts/fetch_zoho_salesorders.py`.
- **Filters:** year select, month select, status tabs (Draft / Confirmed / Fulfilled), Order Type tabs (Government / Private / Donation / Daycare), keyword search.
- **Table columns:** SO #, Date, Customer, Status (badge), Type (badge), Total, Balance, CRM (links to `crm.zoho.com/crm/tab/Potentials/{crm_deal_id}` when present).
- **Row click (Books):** `https://one.zoho.com/zohoone/timionnpc/home/cxapp/books/app/878382704#/salesorders/{id}`
- **Row click (Inventory):** `https://one.zoho.com/zohoone/timionnpc/home/cxapp/inventory/app/878382704#/salesorders/{id}`
- **Analytics:** Orders by Status breakdown, Orders by Type breakdown (4 types, colour-coded), monthly count + value bar charts (visit-dashboard style with y-axis / grid lines / hover tooltips), top customers rank list, CRM deal coverage stat.
- **CRM deal ID:** stored in Zoho's `reference_number` field as `"CRM Deal {id}"`. `_parse_crm_id()` in the fetch script extracts it; `parseCrmId()` in the client provides a fallback for older data.
- **Order Type custom field:** `cf_order_type` — extracted via `_get_custom_field()` which checks top-level key first, then `custom_fields` array. Options: Government, Private, Donation, Daycare.

### Purchase Order Dashboard — Books (`/books/purchase-orders`) and Inventory (`/inventory/purchase-orders`)
Shared client component (`PurchaseOrderClient`) with a `zohoBaseUrl` prop. Both pull from `public/data/purchaseorders.json`. Two views: Orders (filterable table) and Analytics.

- **Data:** current-year purchase orders synced from Zoho. Script: `scripts/fetch_zoho_purchaseorders.py`.
- **Filters:** year select, month select, status tabs (Issued / Received), keyword search.
- **Table columns:** PO #, Date, Vendor, Status (badge), Delivery Date, Total, Balance.
- **Row click (Books):** `https://one.zoho.com/zohoone/timionnpc/home/cxapp/books/app/878382704#/purchaseorders/{id}`
- **Row click (Inventory):** `https://one.zoho.com/zohoone/timionnpc/home/cxapp/inventory/app/878382704#/purchaseorders/{id}`
- **Analytics:** Orders by Status breakdown, monthly count + value bar charts (visit-dashboard style), top vendors rank list.

### Sync schedule and manual trigger
All six dashboards sync in one workflow run (Production, Visit, Order Process, Equipment, Sales Orders, Purchase Orders):
- **Automatic (primary):** Vercel Cron in `vercel.json` — `0 9,15 * * 1-5` → calls `GET /api/sync` (authenticated with auto-generated `CRON_SECRET`) → dispatches `sync-zoho.yml`. Vercel cron is the reliable trigger; GitHub Actions scheduled jobs silently skip runs with no trace when the repo is quiet.
- **Manual:** ↺ Sync button on each dashboard subheader → `POST /api/sync` → dispatches `sync-zoho.yml` via GitHub Actions API. Requires `GITHUB_SYNC_TOKEN` Vercel env var (fine-grained PAT, Actions read/write on this repo).

### CRM data pipeline notes
- Separate Zoho Self Client OAuth app (`ZohoCRM.modules.ALL.READ`). GitHub secrets: `ZOHO_CRM_CLIENT_ID`, `ZOHO_CRM_CLIENT_SECRET`, `ZOHO_CRM_REFRESH_TOKEN`.
- Zoho CRM `Date` fields reject all comparison operators in `/search` criteria — fetch-all + Python filter is the workaround.
- Zoho CRM multi-lookup fields are completely inaccessible via standard GET, related-records endpoint, or search criteria. Requires `ZohoCRM.coql.READ` scope (not yet added).

### Zoho deep-links (all dashboards)
- **Visit cards** → `https://one.zoho.com/…/tab/CustomModule4/{id}`
- **Production cards** → `https://one.zoho.com/…/inventory/app/878382704#/inventory/assembly/{id}`
- **Order rows** → `https://crm.zoho.com/crm/org878871386/tab/Potentials/{id}`
- **Stock vs Orders (CRM links)** → `https://crm.zoho.com/crm/org878871386/tab/Potentials/{crm_deal_id}`
- **Sales Order rows (Books)** → `https://one.zoho.com/zohoone/timionnpc/home/cxapp/books/app/878382704#/salesorders/{id}`
- **Sales Order rows (Inventory)** → `https://one.zoho.com/zohoone/timionnpc/home/cxapp/inventory/app/878382704#/salesorders/{id}`
- **Purchase Order rows (Books)** → `https://one.zoho.com/zohoone/timionnpc/home/cxapp/books/app/878382704#/purchaseorders/{id}`
- **Purchase Order rows (Inventory)** → `https://one.zoho.com/zohoone/timionnpc/home/cxapp/inventory/app/878382704#/purchaseorders/{id}`
- **SO CRM links** → `https://crm.zoho.com/crm/tab/Potentials/{crm_deal_id}` (parsed from `reference_number`)

### Auth
- Email + password sign-in at `/login`
- `proxy.ts` redirects anonymous visitors to `/login` (no-op if Supabase env vars missing)
- Sign-out from header user menu
- Self-protection: admins can't change their own role / active status from `/admin/users`

### Admin panel (admin-only)
- `/admin` — hub with two tiles
- `/admin/users` — table of all profiles; inline role dropdown + active toggle; per-role count chips; **Add User button** — invite by email with name + role pre-assigned (sends Supabase invite email)
- `/admin/access` — **editable** role × section matrix; dropdown per cell (Full / Read-only / Scoped / Hidden); optimistic updates with rollback; "last updated" timestamp; Reset-to-defaults button
- `/auth/callback` — PKCE code-exchange route for invite acceptance, magic link, and OAuth (future)

**Invite flow prerequisites (one-time Supabase/Vercel setup):**
1. Vercel env vars → add `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → service_role key — never NEXT_PUBLIC_ prefix)
2. Supabase → Authentication → URL Configuration → set Site URL to production Vercel URL; add `<url>/auth/callback` to Redirect URLs list

## Users

- `admin@flomatic.co.za` — role `admin`, active, full name "Flomatic"
- (more to be added in Supabase Auth panel until invite-from-UI ships — see BACKLOG.md)

## Access enforcement

**Active as of session 8.** The live policy at `/admin/access` now drives all three enforcement surfaces:

- **`proxy.ts`** — fetches user role + live policy on every request; redirects to `/forbidden` if `canAccess` is false. Admins always pass. `/`, `/forbidden`, and `/api/*` are open to all authenticated users.
- **`TabNav`** — policy fetched once in the intranet layout; only tabs the user's role can access are rendered. Home always visible; Admin tab hardcoded to admin-only.
- **Home hero grid** — server component; only shows section tiles the user can access. Displays Read-only / Scoped badges where applicable. Shows a "No sections assigned yet" message for users with no role assigned.

**`/forbidden` page** — new friendly page at `/forbidden` with a "Back to Home" link, shown when the proxy rejects access.

**Access matrix UI** — cells are now dropdowns (Full / Read-only / Scoped / Hidden) instead of click-to-cycle buttons.

**Single source of truth** — `SECTIONS` in `lib/permissions.ts` now includes `description`, eliminating the previous drift between TabNav, the hero grid, and the permissions file.

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
