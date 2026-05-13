import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";

/**
 * Admin section gate.
 * Server-side check: only profiles with role = 'admin' get through.
 * If Supabase isn't configured yet, also lock down (better safe than
 * accidentally exposing admin tools to the world during the rollout).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login?next=/admin");
  }

  if (profile.role !== "admin") {
    redirect("/");
  }

  return <>{children}</>;
}
