import Link from "next/link";
import { TileGrid } from "@/components/TileGrid";
import { SectionHeader } from "@/components/SectionHeader";

/**
 * Home — welcome strip + hero grid linking to each section.
 * The hero tiles are internal navigation (Next.js Link).
 */
export default function HomePage() {
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

      <SectionHeader
        eyebrow="Sections"
        title="Where would you like to go?"
      />

      <TileGrid hero>
        <HeroTile href="/crm"        icon="👥"  title="CRM"               desc="Patient records, visit & equipment reports, therapist KPIs and Zoho CRM access." />
        <HeroTile href="/inventory"  icon="📦"  title="Inventory"         desc="Production dashboard, reorder levels, production schedule and Zoho Inventory." />
        <HeroTile href="/books"      icon="💰"  title="Books"             desc="Sales orders, purchase orders, inventory valuation and Zoho Books." />
        <HeroTile href="/workshop"   icon="🛠️" title="Workshop"          desc="Production management, job cards, carpenter view and quality control." />
        <HeroTile href="/hr"         icon="🧑‍💼" title="HR"               desc="Leave requests and approvals, staff profiles, and HR dashboards." />
        <HeroTile href="/iso"        icon="✅"  title="ISO / Compliance"  desc="SOP library, auditor portal, compliance documentation and audit calendar." />
        <HeroTile href="/documents"  icon="📁"  title="Documents"         desc="SOPs, BM onboarding pack, policies and organisational templates." />
        <HeroTile href="/board"      icon="📈"  title="Board & Reporting" desc="Annual report, board pack, presentation deck and high-level KPI summaries." />
      </TileGrid>
    </>
  );
}

function HeroTile({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="tile">
      <div className="flex items-center justify-between gap-[10px]">
        <div className="w-[46px] h-[46px] flex items-center justify-center text-[26px] leading-none bg-white/[0.04] border border-border rounded-[10px]">
          {icon}
        </div>
        <span className="status-pill status-pill--soon">Building</span>
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
