"use client";

import { useEffect } from "react";
import { initDashboard } from "./dashboard";
import { SyncButton } from "@/components/SyncButton";

export default function DashboardClient() {
  useEffect(() => {
    initDashboard();
  }, []);

  return (
    <div className="production-dashboard-root">
      <div className="dash-subheader">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="last-synced" id="last-synced">Loading…</span>
          <SyncButton />
        </div>
        <div className="view-toggle">
          <button className="view-btn active" id="btn-view-monthly" type="button">Monthly</button>
          <button className="view-btn"        id="btn-view-analytics" type="button">Analytics</button>
        </div>
      </div>

      <nav className="month-nav">
        <button id="btn-prev" title="Previous month" type="button">&#8592;</button>
        <select id="sel-month" className="nav-select" defaultValue=""></select>
        <select id="sel-year"  className="nav-select" defaultValue=""></select>
        <button id="btn-next" title="Next month"    type="button">&#8594;</button>
      </nav>

      <div id="main-content">
        <div className="loading-overlay">Loading data…</div>
      </div>
    </div>
  );
}
