import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";

export const metadata = { title: "Admin — Timion HQ" };

export default function AdminHubPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Admin"
        title="Administration"
        subtitle="User management and the access policy that governs the rest of the intranet."
      />

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] tile-grid">
        <Link href="/admin/users" className="tile">
          <div className="flex items-center justify-between gap-[10px]">
            <div className="w-[46px] h-[46px] flex items-center justify-center text-[26px] leading-none bg-white/[0.04] border border-border rounded-[10px]">
              👥
            </div>
            <span className="status-pill status-pill--live">Live</span>
          </div>
          <h3 className="font-[family-name:var(--font-sora)] text-base font-bold tracking-tight text-white leading-tight">
            Users
          </h3>
          <p className="flex-1 text-[13.5px] font-medium text-text-soft leading-relaxed">
            See everyone signed into the intranet. Assign roles and activate or deactivate accounts.
          </p>
          <span className="cta-live self-start inline-flex items-center gap-[7px] px-[14px] py-2 rounded-full text-xs font-bold tracking-wide">
            Manage users <span className="cta-arrow cta-arrow-right">→</span>
          </span>
        </Link>

        <Link href="/admin/access" className="tile">
          <div className="flex items-center justify-between gap-[10px]">
            <div className="w-[46px] h-[46px] flex items-center justify-center text-[26px] leading-none bg-white/[0.04] border border-border rounded-[10px]">
              🔐
            </div>
            <span className="status-pill status-pill--live">Live</span>
          </div>
          <h3 className="font-[family-name:var(--font-sora)] text-base font-bold tracking-tight text-white leading-tight">
            Access Policy
          </h3>
          <p className="flex-1 text-[13.5px] font-medium text-text-soft leading-relaxed">
            Read-only matrix of which roles can see which sections. Use it to decide who needs what.
          </p>
          <span className="cta-live self-start inline-flex items-center gap-[7px] px-[14px] py-2 rounded-full text-xs font-bold tracking-wide">
            View matrix <span className="cta-arrow cta-arrow-right">→</span>
          </span>
        </Link>
      </div>
    </>
  );
}
