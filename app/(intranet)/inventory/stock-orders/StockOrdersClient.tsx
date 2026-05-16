"use client";

import { useEffect } from "react";
import { initStockOrdersDashboard } from "./stockOrdersDashboard";
import { SyncButton } from "@/components/SyncButton";

export default function StockOrdersClient() {
  useEffect(() => {
    initStockOrdersDashboard();
  }, []);

  return (
    <div className="so-root">
      <div className="so-subheader">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="so-synced" id="so-synced">Loading…</span>
          <SyncButton />
        </div>
        <div className="view-toggle">
          <button className="view-btn active" id="btn-items"  type="button">Items</button>
          <button className="view-btn"        id="btn-orders" type="button">Orders</button>
        </div>
      </div>

      <div id="so-content">
        <div className="so-loading">Loading data…</div>
      </div>
    </div>
  );
}
