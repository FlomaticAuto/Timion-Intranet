import { SiteHeader } from "@/components/SiteHeader";
import { TabNav } from "@/components/TabNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentProfile } from "@/lib/supabase/profile";

/**
 * The intranet shell reads the user's profile from cookies, so every
 * page inside it must render at request time — not at build time.
 * Without this, Next.js would prerender pages with profile=null and
 * cache the result, so the Admin tab (and any user-specific UI)
 * would never appear for any visitor.
 */
export const dynamic = "force-dynamic";

/**
 * Intranet shell — wraps every tab page with the persistent
 * header, tab navigation, and footer. Fetches the current user's
 * profile once and passes it to both the header and the tab nav,
 * so they share a single query per request.
 */
export default async function IntranetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader profile={profile} />
      <TabNav role={profile?.role ?? null} />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-7 pt-8 pb-16">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
