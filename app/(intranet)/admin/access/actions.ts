"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ROLES,
  SECTIONS,
  DEFAULT_SECTION_ACCESS,
  type Role,
  type SectionPath,
  type AccessLevel,
  type AccessPolicy,
} from "@/lib/permissions";

const POLICY_ID = "access_policy";
const VALID_LEVELS: AccessLevel[] = ["full", "read", "scoped", "none"];

function isValidRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function isValidSection(value: string): value is SectionPath {
  return SECTIONS.some((s) => s.path === value);
}

/**
 * Update one cell of the access matrix. `none` removes the entry so
 * the JSON stays tidy. Returns `{ ok: true }` or `{ error }`.
 * RLS enforces admin-only at the database — this Server Action is
 * just the channel.
 */
export async function setCell(role: string, section: string, level: string) {
  if (!isValidRole(role))       return { error: `Invalid role: ${role}` };
  if (!isValidSection(section)) return { error: `Invalid section: ${section}` };
  if (!VALID_LEVELS.includes(level as AccessLevel)) {
    return { error: `Invalid access level: ${level}` };
  }

  const supabase = await createClient();

  // Read-modify-write so admins can update individual cells without
  // sending the whole policy every time.
  const { data: current, error: readErr } = await supabase
    .from("app_settings")
    .select("value")
    .eq("id", POLICY_ID)
    .maybeSingle();

  if (readErr) return { error: readErr.message };

  const policy: AccessPolicy =
    (current?.value as AccessPolicy) ?? structuredClone(DEFAULT_SECTION_ACCESS);

  policy[role] = { ...(policy[role] ?? {}) };
  if (level === "none") {
    delete policy[role][section];
  } else {
    policy[role][section] = level as AccessLevel;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: writeErr } = await supabase
    .from("app_settings")
    .upsert({
      id:         POLICY_ID,
      value:      policy,
      updated_by: user?.id ?? null,
    });

  if (writeErr) return { error: writeErr.message };

  revalidatePath("/admin/access");
  return { ok: true };
}

/** Replace the entire policy with DEFAULT_SECTION_ACCESS from code. */
export async function resetToDefaults() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("app_settings")
    .upsert({
      id:         POLICY_ID,
      value:      DEFAULT_SECTION_ACCESS,
      updated_by: user?.id ?? null,
    });

  if (error) return { error: error.message };

  revalidatePath("/admin/access");
  return { ok: true };
}
