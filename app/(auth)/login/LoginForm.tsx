"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { error: null };

interface LoginFormProps {
  next?: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/"} />

      <label className="block">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="w-full rounded-lg bg-surface-2 border border-border-bright px-4 py-3 text-text outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 transition-colors"
          placeholder="you@example.com"
        />
      </label>

      <label className="block">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg bg-surface-2 border border-border-bright px-4 py-3 text-text outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 transition-colors"
          placeholder="••••••••"
        />
      </label>

      {state.error && (
        <p className="rounded-lg border border-[rgba(255,75,110,0.3)] bg-[rgba(255,75,110,0.10)] px-4 py-3 text-[13px] text-[#ff4b6e]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cta-live mt-2 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <span className="cta-arrow cta-arrow-right">→</span>}
      </button>
    </form>
  );
}
