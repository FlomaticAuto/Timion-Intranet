/**
 * Auth callback route — handles PKCE code exchange for all Supabase
 * auth flows: invite acceptance, magic link, and OAuth.
 *
 * Supabase redirects here after verifying credentials, passing either:
 *   - ?code=...       (PKCE flow — invite, magic link, OAuth)
 *   - ?token_hash=... (legacy OTP flow)
 *
 * After exchange the user is logged in and redirected to `next` (default /).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url    = new URL(request.url);
  const code   = url.searchParams.get("code");
  const next   = url.searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
