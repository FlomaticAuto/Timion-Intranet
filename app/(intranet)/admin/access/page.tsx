import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  SECTIONS,
  accessFor,
  type AccessLevel,
} from "@/lib/permissions";

export const metadata = { title: "Access Policy — Admin — Timion HQ" };

const LEVELS: Record<AccessLevel, { label: string; cls: string; symbol: string }> = {
  full:   { label: "Full",      symbol: "✓",  cls: "text-green   bg-[rgba(16,217,138,0.10)]  border-[rgba(16,217,138,0.30)]" },
  read:   { label: "Read-only", symbol: "👁", cls: "text-accent  bg-[rgba(124,92,252,0.10)]  border-[rgba(124,92,252,0.30)]" },
  scoped: { label: "Scoped",    symbol: "⚠",  cls: "text-amber   bg-[rgba(255,140,66,0.10)]  border-[rgba(255,140,66,0.30)]" },
  none:   { label: "Hidden",    symbol: "—",  cls: "text-text-dim bg-transparent             border-border" },
};

export default function AccessPolicyPage() {
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
        subtitle="Which roles can see which sections. This is the planning view — use it to decide who needs what before we turn on enforcement."
      />

      {/* Legend */}
      <div className="mb-7 flex flex-wrap gap-3">
        {(Object.entries(LEVELS) as [AccessLevel, typeof LEVELS[AccessLevel]][]).map(([level, meta]) => (
          <div
            key={level}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-semibold ${meta.cls}`}
          >
            <span className="text-base leading-none">{meta.symbol}</span>
            <span>{meta.label}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div className="rounded-2xl border border-border bg-surface overflow-x-auto mb-8">
        <table className="w-full text-left text-[13px] min-w-[800px]">
          <thead>
            <tr className="border-b border-border">
              <th className="py-4 pl-5 pr-3 text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
                Section
              </th>
              {ROLES.map((r) => (
                <th
                  key={r}
                  title={ROLE_DESCRIPTIONS[r]}
                  className="py-4 px-3 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted whitespace-nowrap"
                >
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((section) => (
              <tr key={section.path} className="border-t border-border">
                <td className="py-3 pl-5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none" aria-hidden="true">{section.icon}</span>
                    <span className="font-semibold text-text">{section.label}</span>
                    <span className="text-[10px] text-text-dim font-mono">{section.path}</span>
                  </div>
                </td>
                {ROLES.map((r) => {
                  const level = accessFor(r, section.path);
                  const meta  = LEVELS[level];
                  return (
                    <td key={r} className="py-3 px-3 text-center">
                      <span
                        title={`${ROLE_LABELS[r]} → ${section.label}: ${meta.label}`}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-base ${meta.cls}`}
                      >
                        {meta.symbol}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
        Policy lives in <code className="text-text">lib/permissions.ts</code>. Edit the file, push,
        and the matrix re-renders. Enforcement is not yet active — every signed-in user can currently
        see every section.
      </p>
    </>
  );
}
