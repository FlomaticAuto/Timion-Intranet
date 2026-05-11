import { SectionHeader } from "@/components/SectionHeader";
import { TileGrid } from "@/components/TileGrid";
import { Tile } from "@/components/Tile";

export default function WorkshopPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Workshop"
        title="Production floor & carpenters"
        subtitle="Tools for production management and workshop staff — daily work, job cards, quality."
      />

      <TileGrid>
        <Tile
          variant="comingSoon"
          icon="🧰"
          title="Production Management Report"
          description="Full production view — carpenters' current jobs, production times, insights and quality control."
        />
        <Tile
          variant="comingSoon"
          icon="⚙️"
          title="Production Manager Tools"
          description="Schedule planning, staff assignment, completion tracking and workshop oversight."
        />
        <Tile
          variant="comingSoon"
          icon="📋"
          title="Today's Production List"
          description="Job cards for today — what each carpenter is building, ready to be picked up on the floor."
        />
        <Tile
          variant="comingSoon"
          icon="👷"
          title="Carpenter View"
          description="Phone-friendly view — start a job, mark complete, log issues. Big buttons, one task at a time."
        />
        <Tile
          variant="comingSoon"
          icon="🔬"
          title="Quality Control"
          description="Form-based QC checks — record inspection results, flag defects, sign-off completed items."
        />
      </TileGrid>
    </>
  );
}
