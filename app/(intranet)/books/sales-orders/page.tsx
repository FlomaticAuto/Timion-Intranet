import { SectionHeader } from "@/components/SectionHeader";
import { SalesOrderClient } from "./SalesOrderClient";

export const metadata = {
  title: "Sales Order Dashboard — Timion HQ",
  description: "Current-year sales orders from Zoho Books — status, outstanding balances and CRM links.",
};

export default function SalesOrdersPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Books"
        title="Sales Order Dashboard"
        subtitle="Current-year sales orders from Zoho Books — status, outstanding balances and CRM deal links."
      />
      <SalesOrderClient />
    </>
  );
}
