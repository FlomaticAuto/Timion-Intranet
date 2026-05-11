import { SectionHeader } from "@/components/SectionHeader";
import { TileGrid } from "@/components/TileGrid";
import { Tile } from "@/components/Tile";

export default function BooksPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Books"
        title="Accounting & finance"
        subtitle="Sales, purchases, valuation and the live Zoho Books workspace."
      />

      <TileGrid>
        <Tile
          variant="external"
          href="https://one.zoho.com/zohoone/timionnpc/home/cxapp/books/app/878382704#/home/dashboard"
          icon="🔗"
          title="Zoho Books"
          description="Open the live Zoho Books workspace — invoices, bills, banking and accounting."
        />
        <Tile
          variant="comingSoon"
          icon="🧾"
          title="Sales Order Report"
          description="Dashboard of sales orders — current state, approvals needed, outstanding and order type."
        />
        <Tile
          variant="comingSoon"
          icon="🛒"
          title="Purchase Order Report"
          description="Dashboard of purchase orders — current state, approvals needed, outstanding, top items."
        />
        <Tile
          variant="comingSoon"
          icon="💎"
          title="Inventory Valuation Report"
          description="Current inventory valuation — per item, per category, and total stock value over time."
        />
      </TileGrid>
    </>
  );
}
