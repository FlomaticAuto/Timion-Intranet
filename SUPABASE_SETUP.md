# Supabase setup

One-time setup that enables login and role-based access on the intranet.
After these steps, anyone visiting the site will be redirected to `/login`
until they sign in.

## 1. Create the Supabase project

1. Sign in to <https://supabase.com> under the **Flomatic** account
2. **New project**
   - Name: `Timion Intranet`
   - Database password: generate a strong one and save it in your password manager (the intranet won't need it directly, but you'll want it if you ever connect via psql or the table editor with a privileged role)
   - Region: pick the closest to Eastern Cape (likely `eu-west-2` London or `eu-central-1` Frankfurt for ZA users)
3. Wait ~1 minute for provisioning

## 2. Copy the credentials

In the Supabase dashboard for the new project:

- **Settings → API**
- Copy these two values:
  - **Project URL** — e.g. `https://abcdefgh.supabase.co`
  - **anon public** key — long string starting with `eyJ…`

## 3. Add them to Vercel

In the **Timion-Intranet** Vercel project:

1. **Settings → Environment Variables**
2. Add the two variables to **all three** environments (Production, Preview, Development):
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL from step 2
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key from step 2
3. **Save**

> The `NEXT_PUBLIC_` prefix is intentional — both values are safe to expose to the browser. Real access control comes from Supabase Row Level Security policies.

## 4. Run the schema migration

In Supabase:

1. **SQL Editor → New query**
2. Paste the entire contents of `supabase/migrations/0001_profiles.sql` (in this repo)
3. **Run**

This creates the `profiles` table, the user-role enum, and the auto-create-profile trigger. From now on, any user you add in Auth gets a profile row automatically.

## 5. Lock down sign-ups

By default Supabase allows public sign-ups via its API. For an intranet you want admin-controlled accounts only.

- **Authentication → Settings**
- Turn **"Allow new users to sign up"** **off**
- Save

You'll still be able to create users yourself in the next step.

## 6. Create your first user (and make yourself admin)

1. **Authentication → Users → Add user → Create new user**
2. Enter your email + a temporary password
3. Tick **"Auto Confirm User"** so you don't have to verify the email
4. **Create user**
5. Open **SQL Editor → New query** and run:

   ```sql
   update public.profiles
   set role = 'admin', full_name = 'Your Name'
   where email = 'you@example.com';
   ```

You're now an admin. Future users you add will land with `role = NULL` until you (or another admin) assigns them one.

## 7. Trigger a redeploy

Vercel needs to pick up the new env vars. Either:

- Push any commit (the next git push fires a deploy), or
- Vercel → **Deployments** → the latest deployment's **⋯** menu → **Redeploy**

## 8. Sign in

Visit your live URL. You'll be redirected to `/login`. Enter your email + password from step 6. After successful sign-in you land on `/`.

If anything goes wrong, the form shows the Supabase error message verbatim.

---

## Adding more users later

1. Supabase → **Authentication → Users → Add user**
2. Tick **"Auto Confirm"**, set a temporary password, share it with the user
3. Once they sign in, they have a profile row but no role — they'll be authenticated but won't have any privileged access. Run SQL to assign a role:

   ```sql
   update public.profiles
   set role = 'therapist', full_name = 'Their Name'
   where email = 'their.email@example.com';
   ```

## Roles defined

| Role               | Notional use                                          |
|--------------------|-------------------------------------------------------|
| `admin`            | Full access, user management                          |
| `management`       | Directors, BM — cross-functional view                 |
| `production_manager` | Workshop lead — schedule, stock, full inventory     |
| `carpenter`        | Workshop staff — today's job, mark complete           |
| `therapist`        | Field therapists — visits, patient-linked equipment   |
| `office`           | Reception, finance assistant — SOPs, documents        |
| `auditor`          | External auditor — scoped read-only                   |
| `board`            | Board members — board pack, KPIs, annual report       |

For now, all signed-in users see every page. Role-based visibility comes in the next phase.

## What's not wired yet

- **Sign-up form** — there isn't one; admin adds users in Supabase
- **Password reset email** — set up the template under Authentication → Email Templates if needed
- **Role-based view restrictions** — coming in Phase 2
- **Magic links / Google OAuth** — easy to add later via Supabase auth providers
