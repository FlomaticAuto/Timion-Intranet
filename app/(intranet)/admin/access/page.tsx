import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/permissions";
import { getAccessPolicyRecord } from "@/lib/access";
import { AccessMatrix } from "./AccessMatrix";

export const metadata = { title: "Access Policy — Admin — Timion HQ" };

export default async function AccessPolicyPage() {
  const { policy, updatedAt } = await getAccessPolicyRecord();

  return (
    <>
      <div className="text-[12px] text-text-muted mb-3">
        <Link href="/admin" className="hover:text-accent">Admin</Link>
        <span className="px-2 text-text-dim">/</span>
        <span className="text-text">Access Policy</span>
      </div>

      <SectionHeader
        eyebrow="Admin"
        title="Access Policy"
        subtitle="Which roles can see which sections. Click any cell to edit — changes save immediately."
      />

      <AccessMatrix initialPolicy={policy} updatedAt={updatedAt} />

      {/* Role descriptions */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
        {ROLES.map((r) => (
          <div key={r} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-accent mb-1">
              {ROLE_LABELS[r]}
            </div>
            <p className="text-[13px] text-text-soft leading-relaxed">
              {ROLE_DESCRIPTIONS[r]}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[12px] text-text-muted">
        Policy is stored in <code className="text-text">public.app_settings</code>. The static
        default lives in <code className="text-text">lib/permissions.ts</code> and is what
        &quot;Reset to defaults&quot; restores. Enforcement is not yet active — every signed-in
        user can currently see every section.
      </p>
    </>
  );
}
