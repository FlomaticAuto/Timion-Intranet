"use client";

import { useState, useTransition } from "react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/permissions";
import { updateRole, setActive } from "./actions";

interface ProfileRow {
  id:         string;
  email:      string;
  fullName:   string | null;
  role:       Role | null;
  isActive:   boolean;
  createdAt:  string;
}

interface UserRowProps {
  profile: ProfileRow;
  /** If true, the row's controls are disabled (you can't demote yourself). */
  isSelf:  boolean;
}

const dateFmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-ZA", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
};

export function UserRow({ profile, isSelf }: UserRowProps) {
  const [role,     setRole]     = useState<Role | "">(profile.role ?? "");
  const [isActive, setIsActive] = useState(profile.isActive);
  const [error,    setError]    = useState<string | null>(null);
  const [pending,  startTransition] = useTransition();

  const onRoleChange = (next: Role | "") => {
    setError(null);
    const prev = role;
    setRole(next);
    startTransition(async () => {
      const result = await updateRole(profile.id, next === "" ? null : (next as Role));
      if (result.error) {
        setRole(prev);
        setError(result.error);
      }
    });
  };

  const onActiveToggle = () => {
    setError(null);
    const next = !isActive;
    setIsActive(next);
    startTransition(async () => {
      const result = await setActive(profile.id, next);
      if (result.error) {
        setIsActive(!next);
        setError(result.error);
      }
    });
  };

  const displayName = profile.fullName?.trim() || profile.email;
  const initial = (displayName[0] ?? "?").toUpperCase();

  return (
    <tr className="border-t border-border align-middle">
      <td className="py-3 pr-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full grid place-items-center text-xs font-bold text-white timion-gradient shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-text truncate">{displayName}</div>
            <div className="text-[11px] text-text-muted truncate">{profile.email}</div>
          </div>
          {isSelf && (
            <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-accent">you</span>
          )}
        </div>
      </td>

      <td className="py-3 px-3">
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value as Role | "")}
          disabled={pending || isSelf}
          className="rounded-lg bg-surface-2 border border-border-bright px-3 py-2 text-[12px] font-semibold text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">— Unassigned —</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        {isSelf && (
          <div className="text-[10px] text-text-dim mt-1">Can&apos;t change your own role here.</div>
        )}
      </td>

      <td className="py-3 px-3">
        <button
          type="button"
          onClick={onActiveToggle}
          disabled={pending || isSelf}
          className={[
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            isActive
              ? "border-[rgba(16,217,138,0.30)] bg-[rgba(16,217,138,0.08)] text-green hover:bg-[rgba(16,217,138,0.15)]"
              : "border-[rgba(255,140,66,0.30)] bg-[rgba(255,140,66,0.08)] text-amber hover:bg-[rgba(255,140,66,0.15)]",
          ].join(" ")}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green" : "bg-amber"}`} />
          {isActive ? "Active" : "Inactive"}
        </button>
      </td>

      <td className="py-3 px-3 text-[12px] text-text-muted whitespace-nowrap">
        {dateFmt(profile.createdAt)}
      </td>

      <td className="py-3 pl-3 text-right text-[11px]">
        {pending && <span className="text-text-muted">Saving…</span>}
        {error && <span className="text-[#ff4b6e]">{error}</span>}
      </td>
    </tr>
  );
}
