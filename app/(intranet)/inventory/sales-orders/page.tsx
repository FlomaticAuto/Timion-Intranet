import { SectionHeader } from "@/components/SectionHeader";
import { SalesOrderClient } from "@/app/(intranet)/books/sales-orders/SalesOrderClient";

export const metadata = {
  title: "Sales Order Dashboard — Timion HQ",
  description: "Current-year sales orders from Zoho Inventory — status, outstanding balances and CRM links.",
};

export default function InventorySalesOrdersPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Inventory"
        title="Sales Order Dashboard"
        subtitle="Current-year sales orders from Zoho Inventory — status, outstanding balances and CRM deal links."
      />
      <SalesOrderClient zohoBaseUrl="https://one.zoho.com/zohoone/timionnpc/home/cxapp/inventory/app/878382704" />
    </>
  );
}
