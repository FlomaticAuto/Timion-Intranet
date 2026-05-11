import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client.
 * Use this inside Server Components, Server Actions, Route Handlers,
 * and (later) `proxy.ts` route gating.
 *
 * Note: Next.js 16 makes `cookies()` async — we await it before use.
 * Reads/writes the auth cookies via the App Router's cookie store.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `set` from a Server Component is a no-op when there's no
            // response writer — safe to ignore.
          }
        },
      },
    },
  );
}
