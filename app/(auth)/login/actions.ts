"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type SignInState = {
  error: string | null;
};

/**
 * Sign in with email + password.
 * Form-action compatible: receives `prevState` from useActionState
 * and returns the next state.
 */
export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) {
    return { error: "Email and password are both required." };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { error: "Authentication is not configured yet — Supabase credentials missing." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Successful login: bounce to the originally requested page
  // (or home if there wasn't one).
  redirect(next.startsWith("/") ? next : "/");
}

/**
 * Sign out and bounce back to the login page.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
