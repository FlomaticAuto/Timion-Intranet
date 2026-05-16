import { SectionHeader } from "@/components/SectionHeader";
import StockOrdersClient from "./StockOrdersClient";
import "@/app/stock-orders-styles.css";

export const metadata = {
  title: "Stock vs Orders Dashboard — Timion HQ",
  description: "Stock availability check for all items in current In-Production orders.",
};

export default function StockOrdersPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Inventory"
        title="Stock vs Orders Dashboard"
        subtitle="Stock availability check for all In-Production orders — see what's short, what will drop below reorder level, and what's fully covered."
      />
      <StockOrdersClient />
    </>
  );
}
