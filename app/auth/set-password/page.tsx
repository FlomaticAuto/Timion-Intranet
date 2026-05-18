"use client";

/**
 * Set-password page — two modes:
 *
 * 1. Invite flow: URL has ?token_hash=...&type=invite
 *    We call verifyOtp first to establish the session, then show the form.
 *
 * 2. Direct visit (already authenticated): no token params, session already
 *    exists from a prior login. Just show the form.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

function SetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [ready,    setReady]    = useState(false);   // token verified / session present
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  // On mount: if there's a token_hash in the URL, verify it first.
  useEffect(() => {
    const supabase   = createClient();
    const tokenHash  = searchParams.get("token_hash");
    const type       = searchParams.get("type");

    async function init() {
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: type as any,
        });
        if (error) {
          setError(error.message);
          return;
        }
      }
      setReady(true);
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { needs_password_setup: false },
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-surface border border-border shadow-[0_18px_48px_rgba(0,0,0,0.55)] p-8 md:p-10">
          <div className="flex flex-col items-center gap-4 mb-6">
            <Image
              src="/timion-logo.png"
              alt="Timion"
              width={120}
              height={48}
              priority
              className="h-12 w-auto"
            />
            <div className="text-center space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                Timion HQ
              </p>
              <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold tracking-tight text-white">
                Set your password
              </h1>
              <p className="text-[13px] text-text-soft">
                Choose a password to complete your account setup.
              </p>
            </div>
          </div>

          {/* Verifying token */}
          {!ready && !error && (
            <p className="text-center text-[13px] text-text-muted animate-pulse py-4">
              Verifying your invite link…
            </p>
          )}

          {/* Token / session error */}
          {error && !ready && (
            <div className="space-y-3">
              <div className="rounded-lg border border-[rgba(255,75,110,0.30)] bg-[rgba(255,75,110,0.10)] px-4 py-3 text-[13px] text-[#ff4b6e]">
                {error}
              </div>
              <a
                href="/login"
                className="block text-center text-[12px] text-accent hover:underline"
              >
                ← Back to login
              </a>
            </div>
          )}

          {/* Password form — shown once session is ready */}
          {ready && (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  New password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  disabled={loading}
                  className="w-full rounded-lg bg-surface-2 border border-border-bright px-3 py-2.5 text-[13px] text-text placeholder:text-text-dim outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  disabled={loading}
                  className="w-full rounded-lg bg-surface-2 border border-border-bright px-3 py-2.5 text-[13px] text-text placeholder:text-text-dim outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-[rgba(255,75,110,0.30)] bg-[rgba(255,75,110,0.10)] px-4 py-3 text-[13px] text-[#ff4b6e]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-accent py-2.5 text-[13px] font-semibold text-white hover:bg-accent/85 transition-colors disabled:opacity-50 mt-1"
              >
                {loading ? "Setting password…" : "Set password & continue"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-text-dim tracking-wide">
          Built by Flomatic for the Flomatic × Timion 2026 engagement
        </p>
      </div>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-text-muted text-[13px] animate-pulse">Loading…</p>
        </main>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
