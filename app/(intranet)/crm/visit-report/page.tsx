import { SectionHeader } from "@/components/SectionHeader";
import VisitDashboardClient from "./VisitDashboardClient";

import "@/app/visit-dashboard-styles.css";

export const metadata = {
  title: "Visit Report — Timion HQ",
  description: "Monthly visit data from Zoho CRM — volumes, types, locations, therapist workload and trends.",
};

export default function VisitReportPage() {
  return (
    <>
      <SectionHeader
        eyebrow="CRM"
        title="Visit Report"
        subtitle="Monthly visit data from Zoho CRM — volumes, types, locations, therapist workload and trends."
      />

      <VisitDashboardClient />
    </>
  );
}
