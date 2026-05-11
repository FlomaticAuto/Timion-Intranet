<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent guide — Timion Intranet

## Stack at a glance
- **Next.js 16** (App Router, Turbopack default)
- **React 19.2**
- **Tailwind v4** (CSS-based `@theme`, not `tailwind.config.ts`)
- **TypeScript**
- **Supabase** (`@supabase/ssr` for SSR-friendly auth) — installed, not wired up to features yet
- Deployed on **Vercel**, repo at `github.com/FlomaticAuto/Timion-Intranet`

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
├── _reference/             ← archived static HTML intranet (design source of truth)
├── app/                    ← App Router routes
│   ├── layout.tsx          ← root layout + fonts + metadata
│   ├── page.tsx            ← Home (currently a foundation placeholder)
│   └── globals.css         ← Tailwind v4 + Timion @theme tokens
├── lib/
│   └── supabase/
│       ├── client.ts       ← browser Supabase client
│       └── server.ts       ← server Supabase client (async cookies)
├── public/
│   └── timion-logo.png
├── .env.local.example      ← copy to .env.local locally; values come from Supabase
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

## Auth model (planned, not wired yet)
- Supabase Auth (email/password to start; magic-link or SSO later)
- Roles in a `profiles` table: `admin`, `management`, `production_manager`, `carpenter`, `therapist`, `office`, `auditor`, `board`
- Route gating via `proxy.ts` (Next.js 16 middleware replacement)
- Row-level security in Supabase for data scoping (e.g., therapist sees only assigned patients)

## Build order
1. **Phase 1 — Shell + identity**: tab nav, section landing pages (CRM / Inventory / Books / Workshop / ISO / Documents / Board), Supabase Auth, role gating
2. **Phase 2 — Tools**: Production Dashboard absorbed as `/inventory/production-dashboard` with the GitHub Action moved here; Visit Report, Equipment Report, KPI Dashboard as native routes
3. **Phase 3 — Completion**: SOP library, auditor portal, board pack, polish

## Working locally
```bash
npm install                         # only after a fresh clone
cp .env.local.example .env.local    # then fill in Supabase URL + anon key
npm run dev                          # http://localhost:3000
```
