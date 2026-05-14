"use client";

import { useState } from "react";

type SyncState = "idle" | "loading" | "ok" | "error";

export function SyncButton() {
  const [state, setState] = useState<SyncState>("idle");
  const [errMsg, setErrMsg] = useState("");

  async function trigger() {
    setState("loading");
    setErrMsg("");
    try {
      const res  = await fetch("/api/sync", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setState("ok");
      setTimeout(() => setState("idle"), 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setState("error");
      setErrMsg(msg);
      setTimeout(() => { setState("idle"); setErrMsg(""); }, 6000);
    }
  }

  const label =
    state === "loading" ? "Syncing…"   :
    state === "ok"      ? "✓ Triggered" :
    state === "error"   ? "✗ Failed"   :
    "↺ Sync";

  const title =
    state === "error" ? errMsg :
    state === "ok"    ? "Sync triggered — data will update in ~30 seconds" :
    "Trigger a Zoho data sync now";

  return (
    <button
      className={`sync-btn sync-btn--${state}`}
      onClick={trigger}
      disabled={state === "loading"}
      title={title}
      type="button"
    >
      {label}
    </button>
  );
}
