interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

/**
 * Standard heading block at the top of each section page.
 * Mirrors the static design: tiny coloured eyebrow → big Sora title →
 * subtitle in the soft text colour → gradient divider underline.
 */
export function SectionHeader({ eyebrow, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent mb-[6px]">
        {eyebrow}
      </p>
      <h2 className="font-[family-name:var(--font-sora)] text-[26px] font-bold tracking-tight text-white mb-[6px]">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-text-soft max-w-[720px] leading-relaxed mb-5">
          {subtitle}
        </p>
      )}
      <div className="w-9 h-[3px] rounded-sm timion-gradient" />
    </div>
  );
}
