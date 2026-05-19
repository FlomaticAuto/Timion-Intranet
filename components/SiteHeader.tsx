import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "./UserMenu";
import type { CurrentProfile } from "@/lib/supabase/profile";

interface SiteHeaderProps {
  profile: CurrentProfile | null;
}

/**
 * Top app bar — logo, title, and either the user menu (if signed in)
 * or the version pill (if not). The profile is fetched once by the
 * intranet layout and passed down so we don't re-query per render.
 */
export function SiteHeader({ profile }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-20 h-[68px] bg-surface border-b border-border shadow-[0_1px_3px_rgba(0,0,0,0.4)] flex items-center justify-between px-7 gap-4 relative">
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
        <h1 className="font-[family-name:var(--font-sora)] text-base font-bold tracking-tight text-text">
          Timion HQ
        </h1>
      </Link>

      <div className="flex items-center gap-3">
        {profile ? (
          <UserMenu
            email={profile.email}
            fullName={profile.fullName}
            role={profile.role}
          />
        ) : (
          <span className="rounded-full border border-border bg-white/5 px-3 py-[5px] text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            v0.4 · Phase 1
          </span>
        )}
      </div>
    </header>
  );
}
