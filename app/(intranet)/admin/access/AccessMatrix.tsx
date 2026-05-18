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

const LEVELS: Record<AccessLevel, { label: string; symbol: string }> = {
  full:   { label: "Full",      symbol: "✓"  },
  read:   { label: "Read-only", symbol: "👁" },
  scoped: { label: "Scoped",    symbol: "⚠" },
  none:   { label: "Hidden",    symbol: "—"  },
};

const LEGEND_CLS: Record<AccessLevel, string> = {
  full:   "text-green   bg-[rgba(16,217,138,0.10)]  border-[rgba(16,217,138,0.30)]",
  read:   "text-accent  bg-[rgba(124,92,252,0.10)]  border-[rgba(124,92,252,0.30)]",
  scoped: "text-amber   bg-[rgba(255,140,66,0.10)]  border-[rgba(255,140,66,0.30)]",
  none:   "text-text-dim bg-transparent             border-border",
};

const LEVEL_STYLES: Record<AccessLevel, React.CSSProperties> = {
  full:   { color: "#10d98a", borderColor: "rgba(16,217,138,0.35)",  backgroundColor: "rgba(16,217,138,0.10)"  },
  read:   { color: "#7c5cfc", borderColor: "rgba(124,92,252,0.35)", backgroundColor: "rgba(124,92,252,0.10)" },
  scoped: { color: "#ff8c42", borderColor: "rgba(255,140,66,0.35)", backgroundColor: "rgba(255,140,66,0.10)" },
  none:   { color: "#5e5e7a", borderColor: "rgba(88,88,120,0.25)",  backgroundColor: "transparent"            },
};

const ACCESS_LEVELS: AccessLevel[] = ["full", "read", "scoped", "none"];

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

  const levelAt = (role: Role, section: SectionPath): AccessLevel =>
    policy[role]?.[section] ?? "none";

  const onCellChange = (role: Role, section: SectionPath, newLevel: AccessLevel) => {
    const current = levelAt(role, section);
    if (newLevel === current) return;
    const prev = policy;

    const patched: AccessPolicy = {
      ...policy,
      [role]: { ...(policy[role] ?? {}) },
    };
    if (newLevel === "none") {
      delete patched[role][section];
    } else {
      patched[role][section] = newLevel;
    }

    setPolicy(patched);
    setError(null);

    startTrans(async () => {
      const result = await setCell(role, section, newLevel);
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
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-semibold ${LEGEND_CLS[level]}`}
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

      <div className="rounded-2xl border border-border bg-surface overflow-x-auto mb-8">
        <table className="w-full text-left text-[13px] min-w-[1100px]">
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
                  const lvl = levelAt(r, section.path);
                  return (
                    <td key={r} className="py-2 px-3 text-center">
                      <select
                        value={lvl}
                        onChange={(e) => onCellChange(r, section.path, e.target.value as AccessLevel)}
                        disabled={pending}
                        style={LEVEL_STYLES[lvl]}
                        title={`${ROLE_LABELS[r]} → ${section.label}: ${LEVELS[lvl].label}`}
                        className="w-[108px] rounded-lg border px-2 py-[7px] text-[12px] font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-wait"
                      >
                        {ACCESS_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {LEVELS[level].label}
                          </option>
                        ))}
                      </select>
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
