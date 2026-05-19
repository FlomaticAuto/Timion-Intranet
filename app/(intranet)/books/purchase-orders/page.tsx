import { SectionHeader } from "@/components/SectionHeader";
import { PurchaseOrderClient } from "./PurchaseOrderClient";

export const metadata = {
  title: "Purchase Order Dashboard — Timion HQ",
  description: "Current-year purchase orders from Zoho Books — status, outstanding balances and vendor overview.",
};

export default function PurchaseOrdersPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Books"
        title="Purchase Order Dashboard"
        subtitle="Current-year purchase orders from Zoho Books — status, outstanding balances and vendor overview."
      />
      <PurchaseOrderClient />
    </>
  );
}
