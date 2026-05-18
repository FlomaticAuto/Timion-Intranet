import { SectionHeader } from "@/components/SectionHeader";
import { SalesOrderClient } from "./SalesOrderClient";

export const metadata = {
  title: "Sales Order Report — Timion HQ",
  description: "Current-year sales orders from Zoho Inventory — status, outstanding balances and CRM links.",
};

export default function SalesOrdersPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Books"
        title="Sales Order Report"
        subtitle="Current-year sales orders from Zoho Inventory — status, outstanding balances and CRM deal links."
      />
      <SalesOrderClient />
    </>
  );
}
