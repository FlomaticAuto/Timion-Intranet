import { SectionHeader } from "@/components/SectionHeader";
import { TileGrid } from "@/components/TileGrid";
import { Tile } from "@/components/Tile";

export default function BoardPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Board & Reporting"
        title="Strategic & external reporting"
        subtitle="Annual report, board pack, presentation deck and high-level KPI summaries."
      />

      <TileGrid>
        <Tile
          variant="live"
          href="/timion-presentation.html"
          icon="🎤"
          title="Timion Presentation"
          description="The current Timion organisational presentation deck."
          ctaLabel="Open presentation"
        />
        <Tile
          variant="live"
          href="/annual-report-2026.pdf"
          icon="📕"
          title="Annual Report 2026 (PDF)"
          description="Reference annual report — print version."
          ctaLabel="Open PDF"
        />
        <Tile
          variant="comingSoon"
          icon="📊"
          title="Board Pack"
          description="Quarterly board pack with KPIs, financials and strategic updates."
          ctaLabel="Phase 2"
        />
        <Tile
          variant="comingSoon"
          icon="📑"
          title="KPI Summary"
          description="High-level KPI summary tailored for board members and donors."
        />
      </TileGrid>
    </>
  );
}
