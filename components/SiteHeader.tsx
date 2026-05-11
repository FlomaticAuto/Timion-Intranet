import Image from "next/image";
import Link from "next/link";

/**
 * Top app bar — sticky logo, title and version pill.
 * Matches the static design exactly: 68px tall, dark surface,
 * brand gradient stripe along the bottom.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 h-[68px] bg-surface border-b border-border shadow-[0_1px_3px_rgba(0,0,0,0.4)] flex items-center justify-between px-7 gap-4 relative">
      {/* Gradient stripe along the bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] timion-gradient" />

      <Link href="/" className="flex items-center gap-4 no-underline">
        <Image
          src="/timion-logo.png"
          alt="Timion"
          width={120}
          height={46}
          priority
          className="h-[46px] w-auto"
        />
        <span className="w-px h-8 bg-border-bright shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-[1px]">
          <h1 className="font-[family-name:var(--font-sora)] text-base font-bold tracking-tight text-text leading-tight">
            Timion HQ
          </h1>
          <span className="text-[11px] text-text-muted">
            Internal hub for staff, management &amp; operations
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        <span className="rounded-full border border-border bg-white/5 px-3 py-[5px] text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          v0.2 · Phase 1
        </span>
      </div>
    </header>
  );
}
