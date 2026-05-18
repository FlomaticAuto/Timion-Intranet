/**
 * Next.js 16 proxy (renamed from middleware).
 *
 * Gates every route behind a Supabase session, redirecting anonymous
 * visitors to /login. Public paths (login, auth callbacks, static
 * assets) are allowed through.
 *
 * After confirming a valid session, checks the user's role against the
 * live access policy and redirects to /forbidden if they don't have
 * access to the requested section.
 *
 * If Supabase env vars are not configured yet, this is a no-op so the
 * deploy stays accessible while you finish setting up the project.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SECTIONS,
  canAccess,
  DEFAULT_SECTION_ACCESS,
  type Role,
  type SectionPath,
  type AccessPolicy,
} from "./lib/permissions";

// Paths that don't require a session at all
const PUBLIC_PATHS = ["/login", "/auth"];

// Paths open to all authenticated users regardless of role/policy
const OPEN_AUTHENTICATED = ["/", "/forbidden", "/api"];

/**
 * Map a URL pathname to its top-level section path.
 * Returns null if the path doesn't belong to any known section.
 */
function getSectionPath(pathname: string): SectionPath | null {
  // Sort longest first so /iso doesn't match before /iso/something
  const sectionPaths = [...SECTIONS]
    .map((s) => s.path)
    .filter((p) => p !== "/")
    .sort((a, b) => b.length - a.length) as SectionPath[];

  for (const p of sectionPaths) {
    if (pathname === p || pathname.startsWith(p + "/")) return p;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase not configured yet → let everyone through.
  if (!url || !key) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Static public paths (no session required)
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

  // Home, /forbidden, and /api are open to all authenticated users.
  if (OPEN_AUTHENTICATED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return response;
  }

  // Determine which section this path belongs to.
  const sectionPath = getSectionPath(pathname);
  if (!sectionPath) {
    // Unknown path → fail open (don't block).
    return response;
  }

  // Fetch user role from profiles table.
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profileData?.role ?? null) as Role | null;

  // Admin always has full access — skip policy check.
  if (role === "admin") {
    return response;
  }

  // Fetch live access policy (fall back to static default on error).
  const { data: policyData } = await supabase
    .from("app_settings")
    .select("value")
    .eq("id", "access_policy")
    .maybeSingle();

  const policy = ((policyData?.value as AccessPolicy) ?? DEFAULT_SECTION_ACCESS);

  if (!canAccess(role, sectionPath, policy)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return response;
}

export const config = {
  // Match everything except Next.js internals and static asset extensions.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|ico|json|html|txt)$).*)",
  ],
};
