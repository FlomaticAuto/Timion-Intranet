import Link from "next/link";

type TileVariant = "live" | "external" | "comingSoon";

interface TileProps {
  icon: string;
  title: string;
  description: string;
  variant: TileVariant;
  /**
   * Destination URL.
   * - `live`: usually a path inside the app (e.g. "/inventory/production-dashboard")
   *   or a static file in /public (e.g. "/annual-report-2026.pdf").
   *   Opens in a new tab for now while sections are being built out.
   * - `external`: full URL to a third-party service (e.g. Zoho). New tab.
   * - `comingSoon`: ignored.
   */
  href?: string;
  /** Override the status pill text. Defaults match the variant. */
  badge?: string;
  /** Override the CTA pill text. Defaults match the variant. */
  ctaLabel?: string;
}

const STATUS_PRESETS: Record<TileVariant, { label: string; cls: string }> = {
  live:        { label: "Live",         cls: "status-pill--live" },
  external:    { label: "External",     cls: "status-pill--external" },
  comingSoon:  { label: "Coming Soon",  cls: "status-pill--soon" },
};

const CTA_LABEL: Record<TileVariant, string> = {
  live:       "Open dashboard",
  external:   "Open in Zoho",
  comingSoon: "In planning",
};

/**
 * Card on a section page. Three variants:
 * - `live`     → opens a route or static file (new tab while shell is being built)
 * - `external` → opens a third-party URL in a new tab
 * - `comingSoon` → non-interactive placeholder
 *
 * Colour and hover glow are determined by the tile's position in the
 * surrounding `<TileGrid>` (see globals.css).
 */
export function Tile({
  icon,
  title,
  description,
  variant,
  href,
  badge,
  ctaLabel,
}: TileProps) {
  const status = STATUS_PRESETS[variant];
  const statusLabel = badge ?? status.label;
  const cta = ctaLabel ?? CTA_LABEL[variant];

  const inner = (
    <>
      <div className="flex items-center justify-between gap-[10px]">
        <div className="w-[46px] h-[46px] flex items-center justify-center text-[26px] leading-none bg-white/[0.04] border border-border rounded-[10px]">
          {icon}
        </div>
        <span className={`status-pill ${status.cls}`}>{statusLabel}</span>
      </div>

      <h3 className="font-[family-name:var(--font-sora)] text-base font-bold tracking-tight text-white leading-tight">
        {title}
      </h3>

      <p className="flex-1 text-[13.5px] font-medium text-text-soft leading-relaxed">
        {description}
      </p>

      {/* CTA pill */}
      {variant === "live" && (
        <span className="cta-live self-start inline-flex items-center gap-[7px] px-[14px] py-2 rounded-full text-xs font-bold tracking-wide">
          {cta}
          <span className="cta-arrow cta-arrow-right">→</span>
        </span>
      )}
      {variant === "external" && (
        <span className="cta-external self-start inline-flex items-center gap-[7px] px-[14px] py-2 rounded-full text-xs font-bold tracking-wide">
          {cta}
          <span className="cta-arrow cta-arrow-diag">↗</span>
        </span>
      )}
      {variant === "comingSoon" && (
        <span className="self-start text-[11px] font-bold uppercase tracking-wider text-text-dim">
          {cta}
        </span>
      )}
    </>
  );

  // External or live with full URL — render as a regular anchor (new tab).
  if (variant === "external" && href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="tile">
        {inner}
      </a>
    );
  }

  // Live with a path inside the app or to a /public asset — opens in a new tab
  // for now. Once internal routes are wired, callers can swap to a Link/route.
  if (variant === "live" && href) {
    const isInternalRoute = href.startsWith("/") && !/\.\w+$/.test(href);
    if (isInternalRoute) {
      // Future routes — client-side navigation, stays in shell
      return (
        <Link href={href} className="tile">
          {inner}
        </Link>
      );
    }
    // Static file in /public — open in new tab
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="tile">
        {inner}
      </a>
    );
  }

  // comingSoon — non-interactive
  return <div className="tile tile--coming-soon">{inner}</div>;
}
