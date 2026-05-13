<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent guide — Timion Intranet

## Read these first
Before doing anything in a new session, read:
- `docs/STATUS.md` — what's deployed, who has accounts, what's live, what's pending
- `docs/BACKLOG.md` — deliberately deferred work with enough context to pick up cold
- `docs/DECISIONS.md` — architectural choices already made (don't relitigate)
- `SUPABASE_SETUP.md` — one-time project setup steps (only if setting up from scratch)

These four docs are the canonical session-handoff context. The rest of this file is workflows + stack notes.

## Stack at a glance
- **Next.js 16** (App Router, Turbopack default)
- **React 19.2**
- **Tailwind v4** (CSS-based `@theme`, not `tailwind.config.ts`)
- **TypeScript**
- **Supabase** (`@supabase/ssr` for SSR auth) — login + role-gated admin panel live
- Deployed on **Vercel**, repo at `github.com/FlomaticAuto/Timion-Intranet`, auto-deploys on push to `main`

## v15 → v16 things that bite if you assume older patterns
Before writing code, skim:
- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/`

Quick reminders:
- `cookies()`, `headers()`, `draftMode()` are **async** — always `await`
- `params` / `searchParams` in `page.tsx` / `layout.tsx` are **Promises**: `const { slug } = await props.params`
- The middleware convention is now **`proxy.ts`** with exported `proxy(request)` (no edge runtime — `proxy` is always nodejs)
- `next lint` was removed — `package.json` uses `eslint` directly
- Tailwind v4 uses `@theme { … }` in `globals.css`, not `tailwind.config.ts`

## Project structure
```
Timion_Intranet/
├── _reference/             ← archived static HTML intranet (design reference)
├── app/
│   ├── layout.tsx          ← root layout (fonts, metadata)
│   ├── globals.css         ← Tailwind v4 + Timion @theme tokens
│   ├── dashboard-styles.css← scoped styles for Production Dashboard
│   ├── (auth)/login/       ← /login (server page + client form + Server Actions)
│   └── (intranet)/         ← route group with the persistent shell
│       ├── layout.tsx      ← header + tabs + footer (force-dynamic)
│       ├── page.tsx        ← Home (hero grid)
│       ├── <section>/      ← crm, inventory, books, workshop, iso, documents, board
│       ├── inventory/production-dashboard/  ← absorbed standalone dashboard
│       └── admin/          ← admin-only: users, access (editable matrix)
├── components/             ← SiteHeader, TabNav, Tile, TileGrid, UserMenu, etc.
├── lib/
│   ├── permissions.ts      ← roles, sections, DEFAULT_SECTION_ACCESS, accessFor helper
│   ├── access.ts           ← getAccessPolicy() — fetches live policy from Supabase
│   └── supabase/
│       ├── client.ts       ← browser client (anon key)
│       ├── server.ts       ← server client (async cookies)
│       └── profile.ts      ← getCurrentProfile() helper
├── scripts/fetch_zoho.py   ← writes JSON to public/data/
├── public/
│   ├── data/               ← *.json refreshed by GitHub Action
│   ├── timion-logo.png
│   ├── annual-report-2026.pdf
│   └── timion-presentation.html
├── supabase/migrations/    ← canonical SQL (applied via MCP apply_migration)
├── .github/workflows/sync-zoho.yml  ← cron 09:00 + 15:00 UTC Mon-Fri
├── proxy.ts                ← Next.js 16 route gate (no-op if env vars missing)
├── docs/                   ← STATUS.md, BACKLOG.md, DECISIONS.md
└── ...
```

## Design tokens (mirror of the Production Dashboard palette)
Declared as Tailwind colours in `app/globals.css`. Use as `bg-bg`, `text-text-soft`, `border-border`, etc.

| Token        | Hex      | Use                                |
|--------------|----------|------------------------------------|
| `bg`         | `#080810`| Page background                    |
| `surface`    | `#12121e`| Cards, headers                     |
| `surface-2`  | `#1a1a2e`| Hover / nested surfaces            |
| `accent`     | `#7c5cfc`| Primary brand purple               |
| `accent-2`   | `#4f8ef7`| Secondary brand blue               |
| `amber`      | `#ff8c42`| Warnings, "in production"          |
| `green`      | `#10d98a`| Success, "live", completed         |
| `text`       | `#f0f0f8`| Primary text                       |
| `text-soft`  | `#c8c8d8`| Descriptions — readable on dark    |
| `text-muted` | `#8888aa`| Subtle metadata, labels            |
| `text-dim`   | `#5e5e7a`| Footer text, tertiary info         |

Fonts: **Inter** (sans) + **Sora** (display headings). Loaded via `next/font/google` in `app/layout.tsx`, exposed as `var(--font-inter)` / `var(--font-sora)`. Use `font-[family-name:var(--font-sora)]` on headings.

The static HTML intranet in `_reference/` is the design source of truth — match its look when porting sections.

## Auth model (live)
- Supabase Auth, email + password. Public sign-up is OFF — admin adds users in Supabase Auth panel
- 8 roles defined: `admin`, `management`, `production_manager`, `carpenter`, `therapist`, `office`, `auditor`, `board`
- `profiles` table joined to `auth.users`; auto-create trigger; admin-only role/`is_active` edits enforced by RLS using the `is_admin()` SECURITY DEFINER helper
- Route gating via `proxy.ts` — redirects anonymous visitors to `/login`. **Role-based section gating is not yet active** (see BACKLOG.md). Today every signed-in user can see every tab except `/admin`.

## Workflows

### Local dev
```bash
npm install                      # only after a fresh clone
cp .env.local.example .env.local # fill in Supabase URL + anon key
npm run dev                       # http://localhost:3000
```

### Before pushing
Always run `npm run build` locally — it runs `eslint` first, then `next build`. This matches what Vercel runs, so we catch lint errors before they break the deploy. (Next.js 16 dropped lint from `next build`; we put it back in the npm script.)

### Git identity for commits in this repo
Use the Flomatic identity for every commit:
```bash
git -c user.name="Flomatic" -c user.email="admin@flomatic.co.za" commit -m "..."
```
Include a Co-Authored-By trailer when commits were made by an AI agent.

### Pushing — rebase first if needed
The Zoho sync GitHub Action commits to `public/data/` on its schedule. If a sync ran since your last pull, push will be rejected. Recipe:
```bash
git -c user.name="Flomatic" -c user.email="admin@flomatic.co.za" pull --rebase origin main
git push
```

### Database migrations
Use the Supabase MCP `apply_migration` tool (the agent has it). Two things every migration must do:
1. Be **idempotent** — safe to re-run (`if not exists`, `drop if exists` + recreate, `on conflict do nothing` for seeds)
2. Be **mirrored in the repo** as `supabase/migrations/NNNN_name.sql` — the DB is the live source, the repo is the audit trail

After a DDL migration, run `get_advisors` (security) and address any new warnings.

### File edits — Edit vs Write
Default to **Edit** for any change touching less than ~50% of a file. Use **Write** only for new files or substantial rewrites. Edit produces small reviewable diffs; Write replaces the whole file (looks like a wipe in git).

### Saving memory ("save to memory", "save where we are", etc.)
Update the four docs as appropriate, using Edit (not Write):
- `docs/STATUS.md` — current state. Supersede outdated facts.
- `docs/BACKLOG.md` — open work. Move shipped items to STATUS and **delete** from here.
- `docs/DECISIONS.md` — architectural calls. Append-only with date; mark superseded entries explicitly, don't silently remove.
- `AGENTS.md` — workflows/conventions. Supersede in place when they change.

End every memory save by summarising the diff (what was added / edited / removed across the four docs) so the user can spot anything wrong.

Standardised commit message: `docs: save session memory — <one-line summary>`.

## Build phases (high-level)
1. **Phase 1 — Shell + auth** ✅ Mostly done. Shell, all section landing pages, Supabase Auth, admin panel with editable access policy. Outstanding: turn on role enforcement.
2. **Phase 2 — Tools.** Production Dashboard absorbed ✅. Next: Visit Report, Equipment Report, Therapist KPIs, Upcoming Tasks, Cross Analysis, Workshop tools, Books reports.
3. **Phase 3 — Completion.** SOP library, auditor portal, board pack, polish.

