import { SectionHeader } from "@/components/SectionHeader";
import { TileGrid } from "@/components/TileGrid";
import { Tile } from "@/components/Tile";

export default function CrmPage() {
  return (
    <>
      <SectionHeader
        eyebrow="CRM"
        title="Customer & patient relations"
        subtitle="Patient records, visit logging, equipment history, therapist KPIs and Zoho CRM."
      />

      <TileGrid>
        <Tile
          variant="external"
          href="https://one.zoho.com/zohoone/timionnpc/home/cxapp/crm/org878871386/tab/Home/begin"
          icon="🔗"
          title="Zoho CRM"
          description="Open the live Zoho CRM workspace — patients, contacts, deals, communications."
        />
        <Tile
          variant="live"
          href="/crm/visit-report"
          icon="🚐"
          title="Visit Dashboard"
          description="Dashboard for visits — volumes, types, locations, staff workload and trends."
        />
        <Tile
          variant="comingSoon"
          icon="🦽"
          title="Equipment Dashboard"
          description="Dashboard for equipment history — issuances, pipeline, demand by device type."
        />
        <Tile
          variant="comingSoon"
          icon="📅"
          title="Upcoming Tasks"
          description="View of upcoming tasks per therapist — what's due, when, and for which patient."
        />
        <Tile
          variant="comingSoon"
          icon="📈"
          title="Therapist KPI Dashboard"
          description="Live KPIs across visits, equipment issued, tasks completed — per therapist and team-wide."
        />
        <Tile
          variant="comingSoon"
          icon="🔄"
          title="Cross Analysis"
          description="Patient-level analysis linking visits to equipment outcomes — journey insights."
        />
      </TileGrid>
    </>
  );
}
