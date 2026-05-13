# Backlog

Work deliberately deferred. Each entry has enough context to pick it up cold. When something ships, move it to STATUS.md and delete the entry here.

---

## Turn on role enforcement

**What:** Make the live access policy actually drive visibility and access. Today the policy at `/admin/access` is editable but no code reads it.

**Why deferred:** Wanted Flomatic to assign roles to real staff and review the matrix before flipping any switches. Also a non-admin test user is needed to verify behaviour before real users are invited — without one, we can only test as admin (who sees everything regardless) and can't catch lockout bugs.

**Scope — all four surfaces filter from the same source:**
- **`proxy.ts`** — after auth check, fetch user role + live policy, redirect to `/forbidden` if `canAccess(role, section, policy) === false`. Always allow `/` for any signed-in user so Home is a safe fallback.
- **`TabNav`** — filter the tab list by `canAccess`. The Admin tab stays admin-only via the hardcoded check (defense in depth — never accidentally configurable away).
- **Home hero grid** (`app/(intranet)/page.tsx`) — same filter. If a user can't access CRM, the CRM hero tile is gone. Otherwise we promise "click here for CRM" then redirect them away → looks broken.
- **`/forbidden`** — new tiny page shown when a redirect happens. Friendly "You don't have access to this section — ask an admin if you need it" + back-to-home button.

**Refactor — single source of truth for sections:**
Section metadata (path, icon, label, description) currently lives in three places: `lib/permissions.ts` (path / icon / label), `TabNav.tsx` (icon + label hardcoded again), and `app/(intranet)/page.tsx` (description + icon hardcoded in JSX). They've started drifting. As part of this work, extend the `SECTIONS` array in `lib/permissions.ts` to include `description`, then render both the tab nav AND the hero grid from it.

**UX polish to include:**
- **"Nothing assigned yet" state** on Home — if a signed-in user has no role (or a role with no sections beyond `/`), show a friendly "Welcome. An admin will assign you access to specific sections shortly" message instead of a near-empty hero grid.
- **Read-only badge on hero tiles** when access is `read` — small "Read-only" pill so users know what to expect before clicking.

**Out of scope for this round (note for later):**
- **Inside-section partial access.** A user with `read` on Documents should see the tab + hero tile, but the "Upload SOP" button inside should be hidden/disabled. That's per-tool/per-action granularity, deeper than this layer. Can be added incrementally per-section as tools are built.

**Testing checklist before rollout:**
- Admin sees no behaviour change (still sees everything)
- A test user with role `carpenter` sees only Home, Workshop, Inventory, Documents (per the default matrix)
- Same test user typing `/board` in the URL bar lands on `/forbidden`
- Same test user has only the matching subset of hero tiles on Home (consistent with their tab nav)
- A user with `role = null` sees only Home with the "Welcome, an admin will assign…" message

**Rollback path:** Either `git revert` the enforcement commit, or set every cell in `/admin/access` to `Full` (no deploy needed — ~30 seconds).

**Helpers already in place:** `canAccess(role, path, policy)` and `getAccessPolicy()` exist. The work is wiring, not new logic.

---

## Add users from `/admin/users` UI

**What:** Modal/inline form on the Admin → Users page to invite a new user by email, with role pre-assigned. Currently admins must add users in the Supabase dashboard.

**Why deferred:** Needs a Supabase **service-role** key (server-only, more sensitive than the anon key already in use). Wanted the access policy UI shipped first.

**What it takes:**
- New Vercel env var `SUPABASE_SERVICE_ROLE_KEY` — **never** `NEXT_PUBLIC_`-prefixed
- New `lib/supabase/admin.ts` — service-role client. Top-of-file warning: never import from a `"use client"` file
- "Add User" button on `/admin/users` → modal with email, full name, role dropdown
- Server Action calls `supabase.auth.admin.inviteUserByEmail()` then updates the profile row with chosen role + name
- Same admin client unlocks: resend invite, force password reset, delete user, bulk import (potential follow-ups)

---

## Magic-link or Google OAuth sign-in

**What:** Add password-less options to `/login`. Magic link sends an email; Google OAuth lets staff use existing Google accounts.

**Why deferred:** Email + password works and is familiar.

**What it takes:**
- **Magic link:** enable in Supabase Auth providers, add a tab on `/login`, build `app/auth/callback/route.ts` to handle the code-exchange
- **Google OAuth:** create Google OAuth credentials, enable in Supabase, add a button on `/login`, same callback route handles both flows

---

## Custom domain (`intranet.timion.org` or similar)

**What:** Move from the default `<random>.vercel.app` to a Timion-branded domain.

**Why deferred:** Vercel URL works for now. Needs DNS access at Timion's domain provider.

**What it takes:**
- Vercel → Project Settings → Domains → Add Domain
- CNAME at Timion's DNS provider → `cname.vercel-dns.com`
- Update Supabase Auth → URL Configuration → Site URL + Redirect URLs to the new domain

---

## SMTP from a Timion email address

**What:** Send invite / password-reset emails from `noreply@timion.org` rather than Supabase's default sender.

**Why deferred:** Supabase's default sender works fine for low volume. Will matter more once invite-from-UI is shipped.

**What it takes:**
- Supabase → Authentication → SMTP Settings → enable
- Get outbound SMTP credentials from Timion's email provider (host, port, user, password)
- Optional: customise email templates under Authentication → Email Templates

---

## Password reset flow

**What:** "Forgot password" link on `/login` + reset page.

**Why deferred:** Admin can reset passwords via the Supabase dashboard for now.

**What it takes:**
- "Forgot password" link on `/login`
- Page that calls `supabase.auth.resetPasswordForEmail` with a redirect URL
- Reset confirmation page that takes a new password and calls `supabase.auth.updateUser`

---

## Leaked-password protection (Supabase setting)

**What:** Toggle on the HaveIBeenPwned password check (flagged by the Supabase advisor).

**Why deferred:** Optional security hardening. Doesn't block anything.

**What it takes:** Supabase → Authentication → Settings → Security and Protection → Leaked password protection → On.
