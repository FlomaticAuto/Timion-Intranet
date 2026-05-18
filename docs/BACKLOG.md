# Backlog

Work deliberately deferred. Each entry has enough context to pick it up cold. When something ships, move it to STATUS.md and delete the entry here.

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
