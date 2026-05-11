# Timion Intranet

Internal hub for Timion staff and management — dashboards, documents, compliance and reporting in one place.

Built by **Flomatic** as part of the Flomatic × Timion 2026 engagement.

## Stack
- **Next.js 16** (App Router, Turbopack)
- **React 19.2**
- **Tailwind v4**
- **TypeScript**
- **Supabase** for auth + (later) data
- Deployed on **Vercel**

## Running locally

```bash
npm install
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open <http://localhost:3000>.

## Project status
**v0.1 — Foundation deploy.** The home page is a placeholder confirming the build works end-to-end (repo → Vercel → live URL). The full intranet shell with tab navigation and section pages follows.

See `AGENTS.md` for the full project plan, structure, and design tokens.

## Repo
<https://github.com/FlomaticAuto/Timion-Intranet>
