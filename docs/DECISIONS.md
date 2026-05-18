# Decisions

Architectural choices and their reasoning, in chronological order. Each entry is dated. Don't relitigate — if a decision needs to change, add a new entry with `Supersedes:` and strike through the old one. Both stay visible so history is preserved.

---

## 2026-05-13 · Single monorepo, not multi-repo with iframes

The intranet, the Production Dashboard, and every future tool live in one Next.js repo. Not separate sites glued together with iframes.

**Why:** Auth is the deciding factor. With Supabase, login sets a cookie at one origin. Cross-origin iframe auth is a real engineering tax — third-party cookies, SameSite restrictions, refresh-token handling. One domain = one auth session = trivial role checks. Bonus: shared design system, no iframe UX papercuts, one CI pipeline.

---

## 2026-05-13 · Stack lock: Next.js 16 / React 19.2 / Tailwind v4 / TypeScript

App Router, Turbopack default. CSS variables via `@theme` in `globals.css`. Supabase + `@supabase/ssr` for auth. Deployed on Vercel.

**Why:** Vercel-native (Next.js is by Vercel), Supabase-compatible, all modern. Next.js 16 has breaking changes from earlier versions — async `cookies()` / `headers()` / `params`, `proxy.ts` instead of `middleware.ts`, lint removed from `next build`. AGENTS.md documents the gotchas.

---

## 2026-05-13 · Production Dashboard absorbed, not iframed

The standalone dashboard repo (HTML/JS/Python/GitHub Action) was moved into this repo at `/inventory/production-dashboard` and `scripts/fetch_zoho.py` + `.github/workflows/sync-zoho.yml`. The old repo is archived.

**Why:** Same reasoning as monorepo. Shared shell, shared auth, no cross-origin friction. The 1280-line vanilla JS ported as-is into a Client Component's `useEffect`; CSS scoped under `.production-dashboard-root` to prevent leakage.

---

## 2026-05-13 · Auth: email + password, no public sign-up

`/login` is email + password. New users are added via the Supabase Auth panel (until invite-from-UI ships — see BACKLOG.md). Public sign-up disabled in Supabase settings.

**Why:** Intranet of <50 staff. Email + password is universal and resilient. Public sign-up is a vulnerability for an internal tool. Magic link / OAuth are easy to add later when there's a reason.

---

## 2026-05-13 · Access policy in DB, default in code

The role × section access matrix lives in `public.app_settings` (one JSONB row, admin-only write via RLS). `DEFAULT_SECTION_ACCESS` in `lib/permissions.ts` is the seed and the "Reset to defaults" target.

**Why:** Admins need to adjust who sees what without waiting for a deploy. DB storage makes it a 1-click operation. Keeping the default in code gives a reproducible seed and a known-good fallback.

---

## 2026-05-13 · RLS admin checks via SECURITY DEFINER helper

`public.is_admin()` is a `SECURITY DEFINER`, `STABLE`, `search_path = public` SQL function. RLS policies that need to check admin status call this function instead of doing inline subqueries on `public.profiles`.

**Why:** Initial RLS policies (migration 0001) queried profiles from inside policies on profiles → Postgres detected recursive RLS evaluation and aborted the query, even when sibling policies would have allowed access. Effect: the admin themselves couldn't read their own profile. SECURITY DEFINER + revoked anon EXECUTE solves it cleanly. See migrations 0002 and 0004.

---

## 2026-05-13 · Enforcement deliberately off

`TabNav` and `proxy.ts` don't yet read the live access policy. Every signed-in user sees every tab today (except Admin, which is admin-only via direct check).

**Why:** Flomatic needs to assign roles to real staff and review the matrix at `/admin/access` before turning gates on. Premature enforcement risks locking people out and turning the rollout into a support load.

---

## 2026-05-13 · CRM fetch-all pattern instead of server-side date filtering

`fetch_zoho_crm.py` fetches all records from the `Visits_History` module and filters by month in Python, rather than using Zoho's `/search` criteria endpoint.

**Why:** Zoho CRM `Date` fields do not accept any comparison operators (`between`, `greater_equal`, `less_equal`) in the `/search` criteria endpoint — all return `INVALID_QUERY`. Fetch-all is reliable, simple, and fast enough for a visits module (hundreds to low thousands of records).

---

## 2026-05-13 · Dashboard naming convention

Live internal dashboards use the suffix **"Dashboard"** (e.g. Visit Dashboard, Production Dashboard, Equipment Dashboard). Future history/insight views (full record sets for KPI analysis) will use **"Report"**. This distinction matters for UX — dashboards show current/recent operational data; reports are deeper analytical views.

---

## 2026-05-15 · Zoho CRM multi-lookup fields: drop order_date, export Deals only

`fetch_zoho_crm_orders.py` exports Deals from the Orders Process module without any Equipment History data. Three approaches to fetching the equipment-to-order link were attempted and all failed:

1. **Related-records endpoint** (`/crm/v2/Potentials/{id}/Issued_Equipment`) — returned HTTP 400
2. **Batch field lookup** — `Order_Process_Entry` field was absent from all Deal response bodies, regardless of `fields` param
3. **Search criteria on Issued_Equipment** — Zoho returned `"the field is not available for search"` for `Order_Process_Entry` on all 30 deals

**Root cause:** Zoho CRM v2 multi-lookup fields are invisible to all standard API endpoints. Access requires the `ZohoCRM.coql.READ` scope (COQL API), which is not currently provisioned on the OAuth client.

**Decision:** Drop `order_date` entirely. The Order Process Dashboard works with `created_date` and `closing_date` as the available date columns. COQL scope can be added later if `order_date` becomes business-critical.

---

## 2026-05-15 · Manual sync via GitHub Actions workflow_dispatch

All three dashboard sync scripts (Production, Visit, Order Process) run in a single GitHub Actions workflow (`sync-zoho.yml`). A `POST /api/sync` route dispatches this workflow via the GitHub Actions API, allowing any authenticated user to trigger a sync from within the intranet without needing GitHub access.

**Why:** Users need fresh data on demand between scheduled syncs (11:00 + 17:00 SAST). The dispatch pattern keeps all sync logic in the existing workflow file rather than duplicating script invocations in a Vercel function. Auth check in the route prevents anonymous triggers.

**Requirement:** `GITHUB_SYNC_TOKEN` Vercel env var — a fine-grained PAT with Actions read/write permission on this repo.

---

## 2026-05-18 · Vercel Cron as primary sync trigger (supersedes GitHub Actions schedule)

`vercel.json` declares a cron at `0 9,15 * * 1-5` that calls `GET /api/sync`. Vercel authenticates the call with an auto-generated `CRON_SECRET` header. The route then `workflow_dispatch`es `sync-zoho.yml` on GitHub Actions.

**Why:** GitHub Actions scheduled jobs silently skip runs when the repo has been inactive and leave no trace in the Actions log. Vercel Cron runs reliably every time and appears in Vercel's cron execution log. The GitHub Actions workflow still does all the actual data fetching; Vercel is just the reliable clock.

**Note:** `GET /api/sync` checks `Authorization: Bearer <CRON_SECRET>`. `POST /api/sync` (from the UI Sync button) checks for a valid Supabase session instead.

---

## 2026-05-18 · Shared bar chart component pattern — visit-dashboard style

All bar charts across the Books dashboards (and future dashboards) should follow the visit-dashboard chart design, not an ad-hoc pixel-height approach:

- Y-axis with `niceMax()` + `computeTicks()` for clean round tick intervals
- Horizontal grid lines at each tick
- L-shaped axis borders (left + bottom, `rgba(255,255,255,0.15)`)
- Bars use the brand gradient (`linear-gradient(135deg, #7c5cfc, #4f8ef7)`), `border-radius: 5px 5px 0 0`
- Hover: `group/bar` → `group-hover/bar:brightness-125` on bar fill + tooltip fades in via `opacity-0 group-hover/bar:opacity-100`
- Tooltip: dark `#1a1a2e` surface, `backdropFilter: blur(8px)`, HTML content via `dangerouslySetInnerHTML` (content is 100% internal, never from external input)
- Chart height: 180px. Bars use `height: ${(value/yMax)*100}%` against a full-height flex column — NOT pixel heights, which broke when the column had no explicit height.

**Why:** CSS percentage heights only work when the parent has an explicit height. The flex-column (`height: 100%`) approach means bars size correctly relative to the 180px zone. The visit-dashboard pattern was already proven and its CSS is scoped, so copying the logic (not the CSS) into React inline styles keeps the Books dashboards self-contained.

---

## 2026-05-18 · Zoho Inventory custom fields: `_get_custom_field()` helper pattern

Custom fields on Zoho Inventory records (e.g. `cf_order_type`) are not reliably returned at the top level by all API calls. The fetch scripts use a helper that checks:
1. Top-level key (`record.get("cf_order_type")`) — returned by list endpoints when the field is configured
2. `custom_fields` array (`[{"api_name": "cf_order_type", "value": "..."}]`) — fallback for detail-endpoint or older records

**Why:** Zoho's list API behaviour for custom fields varies by field type and configuration. Checking both prevents silent empty strings if the API changes how it surfaces the field.

---

## 2026-05-13 · Memory file system

`docs/STATUS.md`, `docs/BACKLOG.md`, `docs/DECISIONS.md` are the canonical session-handoff context. `AGENTS.md` points at them and documents workflows. Triggered by the user saying "save to memory" (or variants); agent uses Edit (not Write), supersedes rather than accumulates, moves shipped items from BACKLOG → STATUS, dates DECISIONS entries, never auto-modifies without explicit user request.

**Why:** Conversations get long and expensive. Fresh VS Code sessions need a tight context doc to pick up without re-explaining workflows. The three-doc split keeps each file purpose-clear.
