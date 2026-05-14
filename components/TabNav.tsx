"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/permissions";

interface Tab {
  href:  string;
  icon:  string;
  label: string;
  /** When true, only `admin` users see this tab. */
  adminOnly?: boolean;
}

const TABS: Tab[] = [
  { href: "/",          icon: "🏠",  label: "Home" },
  { href: "/crm",       icon: "👥",  label: "CRM" },
  { href: "/inventory", icon: "📦",  label: "Inventory" },
  { href: "/books",     icon: "💰",  label: "Books" },
  { href: "/workshop",  icon: "🛠️", label: "Workshop" },
  { href: "/hr",        icon: "🧑‍💼", label: "HR" },
  { href: "/iso",       icon: "✅",  label: "ISO / Compliance" },
  { href: "/documents", icon: "📁",  label: "Documents" },
  { href: "/board",     icon: "📈",  label: "Board & Reporting" },
  { href: "/admin",     icon: "⚙️", label: "Admin", adminOnly: true },
];

interface TabNavProps {
  role: Role | null;
}

/**
 * Sticky horizontal tab bar.
 * The Admin tab only renders for admins.
 * Active tab determined by `usePathname()`.
 */
export function TabNav({ role }: TabNavProps) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="sticky top-[68px] z-10 h-[52px] bg-surface border-b border-border px-7 flex items-center gap-1 overflow-x-auto no-scrollbar">
      {visibleTabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "relative inline-flex items-center gap-[6px] px-4 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors",
              active
                ? "text-white bg-accent/10"
                : "text-text-muted hover:text-text hover:bg-white/[0.04]",
            ].join(" ")}
          >
            <span className="text-sm leading-none" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
            {active && (
              <span className="absolute -bottom-[1px] left-3 right-3 h-[2px] rounded-t timion-gradient" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
