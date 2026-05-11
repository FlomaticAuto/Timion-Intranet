import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-xl text-center space-y-8">
        <div className="flex justify-center">
          <Image
            src="/timion-logo.png"
            alt="Timion"
            width={140}
            height={140}
            priority
            className="h-auto w-auto"
          />
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            Foundation deploy
          </p>
          <h1 className="font-[family-name:var(--font-sora)] text-4xl font-bold tracking-tight text-white">
            Timion HQ
          </h1>
          <div className="mx-auto h-1 w-10 rounded timion-gradient" />
        </div>

        <p className="text-text-soft text-base leading-relaxed">
          The internal hub for Timion staff &amp; management.
          <br />
          Dashboards, documents, compliance and reporting — all in one place.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full border border-border-bright bg-surface px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          <span className="h-2 w-2 rounded-full bg-green shadow-[0_0_8px_var(--color-green)]" />
          v0.1 · Phase 1 · Bootstrapping
        </div>

        <p className="text-text-dim text-xs">
          Built by Flomatic for the Flomatic × Timion 2026 engagement
        </p>
      </div>
    </main>
  );
}
