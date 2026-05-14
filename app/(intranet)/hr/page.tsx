import { SectionHeader } from "@/components/SectionHeader";
import { TileGrid } from "@/components/TileGrid";
import { Tile } from "@/components/Tile";

export default function HrPage() {
  return (
    <>
      <SectionHeader
        eyebrow="HR"
        title="People & leave management"
        subtitle="Leave requests, approvals, staff profiles and HR dashboards."
      />

      <TileGrid>
        <Tile
          variant="comingSoon"
          icon="📝"
          title="Leave Requests"
          description="Submit and track leave requests — annual, sick and other leave types, with status updates."
        />
        <Tile
          variant="comingSoon"
          icon="✅"
          title="Leave Approvals"
          description="Review and action pending leave requests — approve, decline or request more information."
        />
        <Tile
          variant="comingSoon"
          icon="📅"
          title="Leave Dashboard"
          description="Overview of leave across the organisation — who's out, upcoming absences and leave balances."
        />
        <Tile
          variant="comingSoon"
          icon="👤"
          title="Staff Profile"
          description="Employee profiles — contact details, role, department, start date and employment history."
        />
      </TileGrid>
    </>
  );
}
