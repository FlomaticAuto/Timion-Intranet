import { SectionHeader } from "@/components/SectionHeader";
import { PurchaseOrderClient } from "@/app/(intranet)/books/purchase-orders/PurchaseOrderClient";

export const metadata = {
  title: "Purchase Order Dashboard — Timion HQ",
  description: "Current-year purchase orders from Zoho Inventory — status, outstanding balances and vendor overview.",
};

export default function InventoryPurchaseOrdersPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Inventory"
        title="Purchase Order Dashboard"
        subtitle="Current-year purchase orders from Zoho Inventory — status, outstanding balances and vendor overview."
      />
      <PurchaseOrderClient zohoBaseUrl="https://inventory.zoho.com/app/timionnpc" />
    </>
  );
}
