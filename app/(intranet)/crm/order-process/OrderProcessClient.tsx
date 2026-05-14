"use client";

import { useEffect } from "react";
import { initOrderDashboard } from "./orderDashboard";
import { SyncButton } from "@/components/SyncButton";

export default function OrderProcessClient() {
  useEffect(() => {
    initOrderDashboard();
  }, []);

  return (
    <div className="op-root">
      {/* Sub-header: last synced + view toggle */}
      <div className="op-subheader">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="op-synced" id="op-synced">Loading…</span>
          <SyncButton />
        </div>
        <div className="view-toggle">
          <button className="view-btn active" id="btn-pipeline" type="button">Pipeline</button>
          <button className="view-btn"        id="btn-orders"   type="button">Orders</button>
          <button className="view-btn"        id="btn-trends"   type="button">Trends</button>
        </div>
      </div>

      {/* Main content area — rendered by orderDashboard.ts */}
      <div id="op-content">
        <div className="op-loading">Loading data…</div>
      </div>
    </div>
  );
}
