"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES, type Role } from "@/lib/permissions";

/**
 * Set a profile's role (or clear it back to NULL).
 * RLS enforces that only admins can perform this — the database is
 * the real guard, this action just feeds it.
 */
export async function updateRole(userId: string, role: Role | null) {
  const supabase = await createClient();

  if (role !== null && !ROLES.includes(role)) {
    return { error: `Invalid role: ${role}` };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * Invite a new user by email. Uses the service-role admin client so
 * it can call supabase.auth.admin.inviteUserByEmail without needing
 * the user to already exist.
 *
 * The trigger on auth.users auto-creates the profile row (picking up
 * full_name from raw_user_meta_data). We then do a second update to
 * set the role, which RLS would block for a regular client.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.
 */
export async function inviteUser(
  email:    string,
  fullName: string | null,
  role:     Role | null,
) {
  if (!email?.trim()) return { error: "Email is required." };
  if (role && !(ROLES as readonly string[]).includes(role)) {
    return { error: `Invalid role: ${role}` };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Build the redirect URL for the invite email.
  // VERCEL_URL is set automatically on Vercel deployments.
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  const opts: Parameters<typeof admin.auth.admin.inviteUserByEmail>[1] = {
    ...(fullName?.trim() ? { data: { full_name: fullName.trim() } } : {}),
    ...(origin ? { redirectTo: `${origin}/auth/callback?next=/auth/set-password` } : {}),
  };

  const { data, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email.trim(),
    opts,
  );

  if (inviteErr) return { error: inviteErr.message };

  // Trigger creates the profile row; update role separately.
  if (data.user?.id && role) {
    await admin.from("profiles").update({ role }).eq("id", data.user.id);
  }

  revalidatePath("/admin/users");
  return { ok: true as const };
}

/**
 * Permanently delete a user from Supabase Auth. The ON DELETE CASCADE
 * on profiles removes their profile row automatically.
 * Uses the service-role admin client — RLS cannot protect auth.users.
 */
export async function deleteUser(userId: string) {
  if (!userId) return { error: "User ID is required." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: true as const };
}

/**
 * Flip a profile's is_active flag. Doesn't sign them out — Supabase
 * Auth still considers them authenticated. We'll wire `is_active`
 * into the proxy when we start enforcing it.
 */
export async function setActive(userId: string, isActive: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}
