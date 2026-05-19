import { SectionHeader } from "@/components/SectionHeader";
import { TileGrid } from "@/components/TileGrid";
import { Tile } from "@/components/Tile";

export default function InventoryPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Inventory"
        title="Stock & production tracking"
        subtitle="Live production dashboard from Zoho Inventory, plus reorder levels and the production schedule."
      />

      <TileGrid>
        <Tile
          variant="external"
          href="https://one.zoho.com/zohoone/timionnpc/home/cxapp/inventory/app/878382704#/home/inventory-dashboard"
          icon="🔗"
          title="Zoho Inventory"
          description="Open the live Zoho Inventory workspace — items, stock movements and adjustments."
        />
        <Tile
          variant="live"
          href="/inventory/sales-orders"
          icon="🧾"
          title="Sales Order Dashboard"
          description="Current-year sales orders from Zoho Inventory — status, outstanding balances and CRM deal links."
        />
        <Tile
          variant="live"
          href="/inventory/purchase-orders"
          icon="🛒"
          title="Purchase Order Dashboard"
          description="Current-year purchase orders from Zoho Inventory — status, outstanding balances and vendor overview."
        />
        <Tile
          variant="comingSoon"
          icon="🔧"
          title="Equipment"
          description="Equipment catalogue — specifications, condition, location, maintenance history and lifecycle status."
        />
        <Tile
          variant="live"
          href="/inventory/stock-orders"
          icon="⚖️"
          title="Stock vs Orders Dashboard"
          description="Stock availability check for In-Production orders — see what's short, at risk, or fully covered."
          ctaLabel="Open dashboard"
        />
        <Tile
          variant="live"
          href="/inventory/reorder-report"
          icon="⚠️"
          title="Reorder Level Report"
          description="Items at or approaching their reorder level — filter by type across finished items, subassemblies, and hardware."
          ctaLabel="Open report"
        />
        <Tile
          variant="live"
          href="/inventory/production-dashboard"
          icon="📊"
          title="Production Dashboard"
          description="Monthly assemblies dashboard — Finished Products vs Subassemblies, in production and completed."
          ctaLabel="Open dashboard"
        />
        <Tile
          variant="comingSoon"
          icon="🗓️"
          title="Production Schedule"
          description="Monthly production schedule connected to the Production Dashboard — mark progress as it happens."
        />
      </TileGrid>
    </>
  );
}
