import { SectionHeader } from "@/components/SectionHeader";
import ReorderClient from "./ReorderClient";
import "@/app/reorder-styles.css";

export const metadata = {
  title: "Reorder Level Report — Timion HQ",
  description: "Stock tracker — items at or approaching their reorder level across all item types.",
};

export default function ReorderReportPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Inventory"
        title="Reorder Level Report"
        subtitle="Items at or approaching their reorder level — filter by type, search by name, or show all tracked stock."
      />
      <ReorderClient />
    </>
  );
}
