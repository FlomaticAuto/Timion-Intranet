"use client";

import { useEffect } from "react";
import { initEquipmentDashboard } from "./equipmentDashboard";
import { SyncButton } from "@/components/SyncButton";

export default function EquipmentClient() {
  useEffect(() => {
    initEquipmentDashboard();
  }, []);

  return (
    <div className="visit-dashboard-root">
      <div className="dash-subheader">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="last-synced" id="eq-last-synced">Loading…</span>
          <SyncButton />
        </div>
        <div className="view-toggle">
          <button className="view-btn active" id="eq-btn-view-monthly"   type="button">Monthly</button>
          <button className="view-btn"        id="eq-btn-view-analytics" type="button">Analytics</button>
        </div>
      </div>

      <nav className="month-nav">
        <button id="eq-btn-prev" title="Previous month" type="button">&#8592;</button>
        <select id="eq-sel-month" className="nav-select" defaultValue=""></select>
        <select id="eq-sel-year"  className="nav-select" defaultValue=""></select>
        <button id="eq-btn-next" title="Next month"    type="button">&#8594;</button>
      </nav>

      <div id="eq-main-content">
        <div className="loading-overlay">Loading data…</div>
      </div>
    </div>
  );
}
