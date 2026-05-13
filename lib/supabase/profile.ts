import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/permissions";

export interface CurrentProfile {
  id:       string;
  email:    string;
  fullName: string | null;
  role:     Role | null;
  isActive: boolean;
}

/**
 * Fetch the currently logged-in user's profile (auth.users + profiles join).
 * Returns null when there's no session OR Supabase isn't configured yet.
 *
 * Call from Server Components / Server Actions / proxy.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id:       user.id,
      email:    user.email ?? "",
      fullName: profile?.full_name ?? null,
      role:     (profile?.role as Role | null) ?? null,
      isActive: profile?.is_active ?? true,
    };
  } catch {
    return null;
  }
}
