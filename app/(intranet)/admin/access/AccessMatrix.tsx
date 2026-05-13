"use client";

import { useState, useTransition } from "react";
import {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  SECTIONS,
  type Role,
  type SectionPath,
  type AccessLevel,
  type AccessPolicy,
} from "@/lib/permissions";
import { setCell, resetToDefaults } from "./actions";

const LEVELS: Record<AccessLevel, { label: string; cls: string; symbol: string }> = {
  full:   { label: "Full",      symbol: "✓",  cls: "text-green   bg-[rgba(16,217,138,0.10)]  border-[rgba(16,217,138,0.30)]  hover:bg-[rgba(16,217,138,0.18)]"  },
  read:   { label: "Read-only", symbol: "👁", cls: "text-accent  bg-[rgba(124,92,252,0.10)]  border-[rgba(124,92,252,0.30)]  hover:bg-[rgba(124,92,252,0.18)]"  },
  scoped: { label: "Scoped",    symbol: "⚠",  cls: "text-amber   bg-[rgba(255,140,66,0.10)]  border-[rgba(255,140,66,0.30)]  hover:bg-[rgba(255,140,66,0.18)]"  },
  none:   { label: "Hidden",    symbol: "—",  cls: "text-text-dim bg-transparent             border-border                   hover:bg-white/[0.04]"             },
};

// Cycle order on click: most permissive → least, then wrap.
const CYCLE: AccessLevel[] = ["full", "read", "scoped", "none"];
const next = (lvl: AccessLevel): AccessLevel => CYCLE[(CYCLE.indexOf(lvl) + 1) % CYCLE.length];

interface AccessMatrixProps {
  initialPolicy: AccessPolicy;
  updatedAt:     string | null;
}

const fmtTs = (iso: string | null): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-ZA", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg",
    });
  } catch {
    return iso;
  }
};

export function AccessMatrix({ initialPolicy, updatedAt }: AccessMatrixProps) {
  const [policy,  setPolicy]  = useState<AccessPolicy>(initialPolicy);
  const [ts,      setTs]      = useState<string | null>(updatedAt);
  const [error,   setError]   = useState<string | null>(null);
  const [pending, startTrans] = useTransition();
  const [busy,    setBusy]    = useState<string | null>(null);

  const levelAt = (role: Role, section: SectionPath): AccessLevel =>
    policy[role]?.[section] ?? "none";

  const onCellClick = (role: Role, section: SectionPath) => {
    const current = levelAt(role, section);
    const target  = next(current);
    const prev    = policy;

    // Optimistic update — patch the local policy immediately
    const patched: AccessPolicy = {
      ...policy,
      [role]: { ...(policy[role] ?? {}) },
    };
    if (target === "none") {
      delete patched[role][section];
    } else {
      patched[role][section] = target;
    }

    setPolicy(patched);
    setError(null);
    setBusy(`${role}|${section}`);

    startTrans(async () => {
      const result = await setCell(role, section, target);
      setBusy(null);
      if (result.error) {
        setPolicy(prev);
        setError(result.error);
      } else {
        setTs(new Date().toISOString());
      }
    });
  };

  const onReset = () => {
    if (!confirm("Reset the entire access policy to defaults? This cannot be undone.")) return;
    const prev = policy;
    setError(null);
    startTrans(async () => {
      const result = await resetToDefaults();
      if (result.error) {
        setPolicy(prev);
        setError(result.error);
      } else {
        // Refresh from server by relying on revalidatePath — but for
        // immediate visual feedback, set local state from a fresh fetch.
        // Simplest: reload.
        window.location.reload();
      }
    });
  };

  return (
    <>
      {/* Top bar: legend + reset + meta */}
      <div className="mb-7 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-3">
          {(Object.entries(LEVELS) as [AccessLevel, typeof LEVELS[AccessLevel]][]).map(([level, meta]) => (
            <div
              key={level}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-semibold ${meta.cls.split(" ").filter((c) => !c.startsWith("hover:")).join(" ")}`}
            >
              <span className="text-base leading-none">{meta.symbol}</span>
              <span>{meta.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted">
            Last updated: <span className="text-text">{fmtTs(ts)}</span>
          </span>
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className="rounded-lg border border-border-bright bg-surface-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-text-muted hover:text-accent hover:border-accent/40 hover:bg-accent/10 transition-colors disabled:opacity-50"
          >
            Reset to defaults
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-[rgba(255,75,110,0.30)] bg-[rgba(255,75,110,0.10)] px-4 py-3 text-[13px] text-[#ff4b6e]">
          {error}
        </div>
      )}

      <div className="mb-3 text-[12px] text-text-muted">
        Click any cell to cycle: <span className="text-green">Full</span> →{" "}
        <span className="text-accent">Read</span> →{" "}
        <span className="text-amber">Scoped</span> →{" "}
        <span className="text-text-dim">Hidden</span> → Full.
      </div>

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
                  const lvl   = levelAt(r, section.path);
                  const meta  = LEVELS[lvl];
                  const isBusy = busy === `${r}|${section.path}`;
                  return (
                    <td key={r} className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onCellClick(r, section.path)}
                        disabled={pending}
                        title={`${ROLE_LABELS[r]} → ${section.label}: ${meta.label}\nClick to change to ${LEVELS[next(lvl)].label}`}
                        className={[
                          "inline-flex items-center justify-center w-9 h-9 rounded-lg border text-base transition-colors",
                          meta.cls,
                          "disabled:cursor-wait disabled:opacity-50",
                          isBusy ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : "",
                        ].join(" ")}
                      >
                        {meta.symbol}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
