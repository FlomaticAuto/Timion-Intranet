"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
