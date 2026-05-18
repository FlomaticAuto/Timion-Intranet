"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SECTIONS,
  canAccess,
  type Role,
  type SectionPath,
  type AccessPolicy,
} from "@/lib/permissions";

interface TabNavProps {
  role:   Role | null;
  policy: AccessPolicy;
}

export function TabNav({ role, policy }: TabNavProps) {
  const pathname = usePathname();
  const isAdmin  = role === "admin";

  const visibleTabs = SECTIONS.filter((s) => {
    if (s.path === "/admin") return isAdmin;
    if (s.path === "/")      return true; // Home always visible to authenticated users
    return canAccess(role, s.path as SectionPath, policy);
  });

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="sticky top-[68px] z-10 h-[52px] bg-surface border-b border-border px-7 flex items-center gap-1 overflow-x-auto no-scrollbar">
      {visibleTabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <Link
            key={tab.path}
            href={tab.path}
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
