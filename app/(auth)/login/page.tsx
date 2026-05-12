import Image from "next/image";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign in — Timion HQ",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

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
                Sign in to continue
              </h1>
              <p className="text-[13px] text-text-soft">
                Enter the credentials your administrator gave you.
              </p>
            </div>
          </div>

          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-[11px] text-text-dim tracking-wide">
          Built by Flomatic for the Flomatic × Timion 2026 engagement
        </p>
      </div>
    </main>
  );
}
