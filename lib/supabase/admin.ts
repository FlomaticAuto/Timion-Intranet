/**
 * Supabase admin client — uses the service-role key which bypasses RLS.
 *
 * ONLY call from Server Components, Server Actions, or Route Handlers.
 * NEVER import this file from a "use client" module — the service-role
 * key must never reach the browser.
 */
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!key) throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your Vercel environment variables (never prefix it with NEXT_PUBLIC_).",
  );

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });
}
