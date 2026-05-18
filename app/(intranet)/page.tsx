import Link from "next/link";
import { TileGrid } from "@/components/TileGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getAccessPolicy } from "@/lib/access";
import {
  SECTIONS,
  canAccess,
  accessFor,
  type AccessLevel,
  type SectionPath,
} from "@/lib/permissions";

export default async function HomePage() {
  const [profile, policy] = await Promise.all([
    getCurrentProfile(),
    getAccessPolicy(),
  ]);
  const role = profile?.role ?? null;

  // Hero grid: all sections except "/" (home) and "/admin", filtered by access
  const heroSections = SECTIONS.filter((s) => {
    if (s.path === "/" || s.path === "/admin") return false;
    return canAccess(role, s.path as SectionPath, policy);
  });

  const noSections = heroSections.length === 0;

  return (
    <>
      <div className="mb-8 flex items-center gap-[18px] flex-wrap rounded-2xl border border-[rgba(124,92,252,0.30)] px-7 py-6 shadow-md bg-[linear-gradient(135deg,rgba(124,92,252,0.12),rgba(79,142,247,0.08))]">
        <div className="text-3xl leading-none shrink-0">👋</div>
        <div className="flex-1 min-w-[240px]">
          <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold tracking-tight text-white mb-1">
            Welcome to Timion HQ
          </h2>
          <p className="text-[13px] font-medium text-text-soft leading-relaxed">
            One front door for everything Timion uses — dashboards, documents, compliance, reporting.
            Pick a tab above, or jump straight into a section below.
          </p>
        </div>
      </div>

      {noSections ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center mt-4">
          <div className="text-5xl mb-5">🔐</div>
          <h3 className="font-[family-name:var(--font-sora)] text-lg font-bold text-white mb-2">
            No sections assigned yet
          </h3>
          <p className="text-[14px] text-text-soft max-w-sm mx-auto leading-relaxed">
            Welcome to Timion HQ. An admin will assign you access to specific sections shortly.
          </p>
        </div>
      ) : (
        <>
          <SectionHeader
            eyebrow="Sections"
            title="Where would you like to go?"
          />

          <TileGrid hero>
            {heroSections.map((s) => {
              const level = accessFor(role, s.path as SectionPath, policy);
              return (
                <HeroTile
                  key={s.path}
                  href={s.path}
                  icon={s.icon}
                  title={s.label}
                  desc={s.description}
                  level={level}
                />
              );
            })}
          </TileGrid>
        </>
      )}
    </>
  );
}

function HeroTile({
  href,
  icon,
  title,
  desc,
  level,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  level: AccessLevel;
}) {
  return (
    <Link href={href} className="tile">
      <div className="flex items-center justify-between gap-[10px]">
        <div className="w-[46px] h-[46px] flex items-center justify-center text-[26px] leading-none bg-white/[0.04] border border-border rounded-[10px]">
          {icon}
        </div>
        {level === "read" && (
          <span className="status-pill status-pill--soon">Read-only</span>
        )}
        {level === "scoped" && (
          <span className="status-pill status-pill--soon">Scoped</span>
        )}
      </div>
      <h3 className="font-[family-name:var(--font-sora)] text-base font-bold tracking-tight text-white leading-tight">
        {title}
      </h3>
      <p className="flex-1 text-[13.5px] font-medium text-text-soft leading-relaxed">
        {desc}
      </p>
      <span className="cta-live self-start inline-flex items-center gap-[7px] px-[14px] py-2 rounded-full text-xs font-bold tracking-wide">
        Open section
        <span className="cta-arrow cta-arrow-right">→</span>
      </span>
    </Link>
  );
}
