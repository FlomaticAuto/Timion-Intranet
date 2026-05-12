/**
 * Next.js 16 proxy (renamed from middleware).
 *
 * Gates every route behind a Supabase session, redirecting anonymous
 * visitors to /login. Public paths (login, auth callbacks, static
 * assets) are allowed through.
 *
 * If Supabase env vars are not configured yet, this is a no-op so the
 * deploy stays accessible while you finish setting up the project.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Paths that don't require a session
const PUBLIC_PATHS = ["/login", "/auth"];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase not configured yet → let everyone through.
  if (!url || !key) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() verifies the session against Supabase (secure).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirect = new URL("/login", request.url);
    if (pathname !== "/") redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  // Match everything except Next.js internals and static asset extensions.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|ico|json|html|txt)$).*)",
  ],
};
