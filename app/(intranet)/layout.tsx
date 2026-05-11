import { SiteHeader } from "@/components/SiteHeader";
import { TabNav } from "@/components/TabNav";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Intranet shell — wraps every tab page with the persistent
 * header, tab navigation, and footer. The shell stays mounted
 * as you navigate between tabs, so only the page body re-renders.
 */
export default function IntranetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <TabNav />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-7 pt-8 pb-16">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
