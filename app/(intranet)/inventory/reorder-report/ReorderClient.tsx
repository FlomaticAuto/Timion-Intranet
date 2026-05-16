"use client";

import { useEffect } from "react";
import { initReorderDashboard } from "./reorderDashboard";
import { SyncButton } from "@/components/SyncButton";

export default function ReorderClient() {
  useEffect(() => {
    initReorderDashboard();
  }, []);

  return (
    <div className="rl-root">
      <div className="rl-subheader">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="rl-synced" id="rl-synced">Loading…</span>
          <SyncButton />
        </div>
      </div>

      <div id="rl-content">
        <div className="rl-loading">Loading data…</div>
      </div>
    </div>
  );
}
