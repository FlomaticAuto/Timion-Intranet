"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const [password, setPassword]   = useState("");
  const [confirm,  setConfirm]    = useState("");
  const [error,    setError]      = useState<string | null>(null);
  const [loading,  setLoading]    = useState(false);
  const router = useRouter();

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
    const { error: updateError } = await supabase.auth.updateUser({ password });
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
        </div>

        <p className="mt-6 text-center text-[11px] text-text-dim tracking-wide">
          Built by Flomatic for the Flomatic × Timion 2026 engagement
        </p>
      </div>
    </main>
  );
}
