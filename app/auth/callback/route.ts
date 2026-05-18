/**
 * Auth callback route — handles all Supabase auth redirect flows:
 *   - ?code=...                      (PKCE — OAuth, newer magic links)
 *   - ?token_hash=...&type=...       (OTP — invite links, email magic links)
 *
 * IMPORTANT: cookies must be written directly onto the redirect Response,
 * not via the next/headers cookie store — cookies() writes to Next.js's
 * internal response, which is bypassed when we return NextResponse.redirect().
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const url        = new URL(request.url);
  const code       = url.searchParams.get("code");
  const tokenHash  = url.searchParams.get("token_hash");
  const type       = url.searchParams.get("type");
  const next       = url.searchParams.get("next") ?? "/";

  if (!code && !tokenHash) {
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

  let userMetadata: Record<string, unknown> | undefined;

  if (code) {
    // PKCE flow (OAuth, newer magic links)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
    userMetadata = data.user?.user_metadata;
  } else if (tokenHash && type) {
    // OTP / token-hash flow (invite links, email magic links)
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as Parameters<typeof supabase.auth.verifyOtp>[0]["type"],
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
    userMetadata = data.user?.user_metadata;
  }

  // Invited users have needs_password_setup in their metadata.
  const destination = userMetadata?.needs_password_setup
    ? "/auth/set-password"
    : next;

  const response = NextResponse.redirect(new URL(destination, url.origin));

  // Copy session cookies from the exchange onto the redirect response.
  cookieJar.cookies.getAll().forEach(({ name, value, ...rest }) => {
    response.cookies.set({ name, value, ...rest });
  });

  return response;
}
