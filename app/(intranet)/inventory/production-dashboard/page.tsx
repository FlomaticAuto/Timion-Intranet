import { SectionHeader } from "@/components/SectionHeader";
import DashboardClient from "./DashboardClient";

// Load the dashboard's scoped stylesheet only when this route is rendered.
import "@/app/dashboard-styles.css";

export const metadata = {
  title: "Production Dashboard — Timion HQ",
  description: "Monthly assemblies from Zoho Inventory — Finished Products vs Subassemblies, in production and completed.",
};

export default function ProductionDashboardPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Inventory"
        title="Production Dashboard"
        subtitle="Monthly assemblies from Zoho Inventory — Finished Products vs Subassemblies, in production and completed."
      />

      <DashboardClient />
    </>
  );
}
