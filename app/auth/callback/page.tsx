"use client";

/**
 * Auth callback page — handles all Supabase invite / magic-link flows
 * entirely in the browser so the client handles cookie setting natively.
 *
 * Supabase can deliver tokens three ways:
 *   ?code=...                    → PKCE (OAuth / newer flows)
 *   ?token_hash=...&type=...     → OTP token hash (invite links)
 *   #access_token=...            → implicit fragment (legacy)
 *
 * The browser Supabase client handles all three without any manual
 * cookie-copying, which was the source of repeated server-side failures.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase   = createClient();
    const code       = searchParams.get("code");
    const tokenHash  = searchParams.get("token_hash");
    const type       = searchParams.get("type");
    const next       = searchParams.get("next") ?? "/";

    async function handle() {
      let meta: Record<string, unknown> | undefined;

      if (code) {
        // PKCE flow (OAuth, newer magic links)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setErrMsg(error.message); return; }
        meta = data.user?.user_metadata;

      } else if (tokenHash && type) {
        // OTP token-hash flow — invite links, email magic links
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: type as any,
        });
        if (error) { setErrMsg(error.message); return; }
        meta = data.user?.user_metadata;

      } else {
        // Fragment / implicit flow (#access_token=...) — getSession picks it up
        const { data } = await supabase.auth.getSession();
        meta = data.session?.user?.user_metadata;
      }

      // Invited users land on set-password; everyone else goes to `next`.
      router.replace(meta?.needs_password_setup ? "/auth/set-password" : next);
    }

    handle();
  // searchParams is stable — only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (errMsg) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="rounded-2xl bg-surface border border-border p-8 max-w-md w-full text-center space-y-4">
          <p className="text-[13px] text-[#ff4b6e]">{errMsg}</p>
          <a href="/login" className="text-[13px] text-accent hover:underline">
            ← Back to login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-text-muted text-[13px] animate-pulse">Signing in…</p>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-text-muted text-[13px] animate-pulse">Signing in…</p>
        </main>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
