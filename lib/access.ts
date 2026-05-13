import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SECTION_ACCESS, type AccessPolicy } from "@/lib/permissions";

export interface AccessPolicyRecord {
  policy:     AccessPolicy;
  updatedAt:  string | null;
  updatedBy:  string | null;
}

const POLICY_ID = "access_policy";

/**
 * Fetch the live access policy from Supabase, falling back to the
 * static default when Supabase isn't reachable or the row is missing.
 * Call from Server Components / Server Actions.
 */
export async function getAccessPolicy(): Promise<AccessPolicy> {
  const record = await getAccessPolicyRecord();
  return record.policy;
}

/** Same as `getAccessPolicy` but also returns `updated_at` / `updated_by`. */
export async function getAccessPolicyRecord(): Promise<AccessPolicyRecord> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { policy: DEFAULT_SECTION_ACCESS, updatedAt: null, updatedBy: null };
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value, updated_at, updated_by")
      .eq("id", POLICY_ID)
      .maybeSingle();

    if (!data?.value) {
      return { policy: DEFAULT_SECTION_ACCESS, updatedAt: null, updatedBy: null };
    }

    return {
      policy:    data.value as AccessPolicy,
      updatedAt: data.updated_at ?? null,
      updatedBy: data.updated_by ?? null,
    };
  } catch {
    return { policy: DEFAULT_SECTION_ACCESS, updatedAt: null, updatedBy: null };
  }
}
