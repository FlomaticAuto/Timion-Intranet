import { SectionHeader } from "@/components/SectionHeader";
import { TileGrid } from "@/components/TileGrid";
import { Tile } from "@/components/Tile";

export default function IsoPage() {
  return (
    <>
      <SectionHeader
        eyebrow="ISO / Compliance"
        title="Standards & audit readiness"
        subtitle="SOP library, compliance documentation, and the auditor-facing portal."
      />

      <TileGrid>
        <Tile
          variant="comingSoon"
          icon="📚"
          title="SOP Library"
          description="Standard operating procedures organised by department and topic."
        />
        <Tile
          variant="comingSoon"
          icon="🔍"
          title="Auditor Portal"
          description="Scoped read-only view for external auditors — only relevant documents, clean navigation."
          ctaLabel="Phase 2"
        />
        <Tile
          variant="comingSoon"
          icon="📜"
          title="Compliance Documents"
          description="Certifications, registrations, policies and statutory documents."
        />
        <Tile
          variant="comingSoon"
          icon="🗓️"
          title="Audit Calendar"
          description="Upcoming audits, renewal dates, compliance deadlines."
        />
      </TileGrid>
    </>
  );
}
