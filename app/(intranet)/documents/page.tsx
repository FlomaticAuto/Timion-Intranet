import { SectionHeader } from "@/components/SectionHeader";
import { TileGrid } from "@/components/TileGrid";
import { Tile } from "@/components/Tile";

export default function DocumentsPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Documents"
        title="Knowledge & resources"
        subtitle="A central library for SOPs, onboarding material, policies and templates."
      />

      <TileGrid>
        <Tile
          variant="comingSoon"
          icon="📚"
          title="SOP Library"
          description="Standard operating procedures, searchable by department or topic."
        />
        <Tile
          variant="comingSoon"
          icon="🎓"
          title="BM Onboarding Pack"
          description="Everything a new Branch Manager needs in their first 30 days."
          ctaLabel="Phase 3"
        />
        <Tile
          variant="comingSoon"
          icon="⚖️"
          title="Policies"
          description="HR, finance, child protection and other organisational policies."
        />
        <Tile
          variant="comingSoon"
          icon="📄"
          title="Templates"
          description="Letterheads, report templates, donor communication templates."
        />
      </TileGrid>
    </>
  );
}
