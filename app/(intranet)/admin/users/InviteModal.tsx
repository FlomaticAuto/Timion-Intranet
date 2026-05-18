"use client";

import { useState, useTransition } from "react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/permissions";
import { inviteUser } from "./actions";

export function InviteModal() {
  const [open,     setOpen]     = useState(false);
  const [email,    setEmail]    = useState("");
  const [fullName, setFullName] = useState("");
  const [role,     setRole]     = useState<Role | "">("");
  const [result,   setResult]   = useState<{ ok?: true; error?: string } | null>(null);
  const [pending,  startTrans]  = useTransition();

  const close = () => {
    setOpen(false);
    setEmail("");
    setFullName("");
    setRole("");
    setResult(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    startTrans(async () => {
      const res = await inviteUser(
        email.trim(),
        fullName.trim() || null,
        (role || null) as Role | null,
      );
      setResult(res);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-[13px] font-semibold hover:bg-accent/85 transition-colors"
      >
        <span className="text-base leading-none">+</span>
        Add User
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal card */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
              <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">
                Invite New User
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-text-muted hover:text-text transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {result?.ok ? (
                /* Success state */
                <div className="text-center py-4">
                  <div className="text-5xl mb-4 leading-none">✉️</div>
                  <h3 className="font-[family-name:var(--font-sora)] font-bold text-white mb-2">
                    Invite sent!
                  </h3>
                  <p className="text-[13px] text-text-soft mb-6 leading-relaxed">
                    An email has been sent to{" "}
                    <span className="text-white font-semibold">{email}</span> with a
                    link to accept the invitation and set their password.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="px-5 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent text-[13px] font-semibold hover:bg-accent/20 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Invite form */
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                      Email address <span className="text-[#ff4b6e]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staff@timion.org"
                      disabled={pending}
                      className="w-full rounded-lg bg-surface-2 border border-border-bright px-3 py-2.5 text-[13px] text-text placeholder:text-text-dim outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Smith"
                      disabled={pending}
                      className="w-full rounded-lg bg-surface-2 border border-border-bright px-3 py-2.5 text-[13px] text-text placeholder:text-text-dim outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role | "")}
                      disabled={pending}
                      className="w-full rounded-lg bg-surface-2 border border-border-bright px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                    >
                      <option value="">— Unassigned —</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-text-dim">
                      You can always change this later from the Users table.
                    </p>
                  </div>

                  {result?.error && (
                    <div className="rounded-lg border border-[rgba(255,75,110,0.30)] bg-[rgba(255,75,110,0.10)] px-4 py-3 text-[13px] text-[#ff4b6e]">
                      {result.error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={close}
                      disabled={pending}
                      className="flex-1 rounded-lg border border-border-bright bg-surface-2 py-2.5 text-[13px] font-semibold text-text-muted hover:text-text transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="flex-1 rounded-lg bg-accent py-2.5 text-[13px] font-semibold text-white hover:bg-accent/85 transition-colors disabled:opacity-50"
                    >
                      {pending ? "Sending…" : "Send Invite"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
