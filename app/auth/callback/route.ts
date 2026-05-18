/**
 * Auth callback route — handles PKCE code exchange for all Supabase
 * auth flows: invite acceptance, magic link, and OAuth.
 *
 * Supabase redirects here after verifying credentials, passing either:
 *   - ?code=...       (PKCE flow — invite, magic link, OAuth)
 *
 * After exchange the user is logged in and redirected to `next` (default /).
 *
 * IMPORTANT: cookies must be written directly onto the redirect Response,
 * not via the next/headers cookie store — cookies() writes to Next.js's
 * internal response, which is bypassed when we return NextResponse.redirect().
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const url    = new URL(request.url);
  const code   = url.searchParams.get("code");
  const next   = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // Placeholder response — supabase writes Set-Cookie headers here.
  const cookieJar = new NextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieJar.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  const destination = data.user?.user_metadata?.needs_password_setup
    ? "/auth/set-password"
    : next;

  const response = NextResponse.redirect(new URL(destination, url.origin));

  // Copy session cookies from the exchange onto the redirect response.
  cookieJar.cookies.getAll().forEach(({ name, value, ...rest }) => {
    response.cookies.set({ name, value, ...rest });
  });

  return response;
}
