"use client";

import { useEffect, useMemo, useState } from "react";
import { SyncButton } from "@/components/SyncButton";

interface PurchaseOrder {
  id:              string;
  number:          string;
  reference:       string;
  date:            string;
  delivery_date:   string;
  vendor:          string;
  status:          string;
  approval_status: string;
  total:           number;
  balance:         number;
  currency:        string;
}

interface DataFile {
  synced_at: string;
  year:      number;
  orders:    PurchaseOrder[];
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft:             { label: "Draft",           color: "rgba(255,140,66,0.15)"  },
  open:              { label: "Open",            color: "rgba(16,217,138,0.12)"  },
  billed:            { label: "Billed",          color: "rgba(124,92,252,0.15)"  },
  partially_billed:  { label: "Partial Bill",    color: "rgba(79,142,247,0.15)"  },
  overdue:           { label: "Overdue",          color: "rgba(255,75,110,0.15)"  },
  cancelled:         { label: "Cancelled",        color: "rgba(94,94,122,0.15)"   },
  void:              { label: "Void",            color: "rgba(94,94,122,0.10)"   },
};

const STATUS_TEXT: Record<string, string> = {
  draft:            "#ff8c42",
  open:             "#10d98a",
  billed:           "#a78bfa",
  partially_billed: "#4f8ef7",
  overdue:          "#ff4b6e",
  cancelled:        "#5e5e7a",
  void:             "#5e5e7a",
};

const fmt = (n: number) =>
  "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (s: string) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s; }
};

export function PurchaseOrderClient() {
  const [data,          setData]          = useState<DataFile | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [search,        setSearch]        = useState("");

  useEffect(() => {
    fetch("/data/purchaseorders.json")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const orders = useMemo(() => data?.orders ?? [], [data]);

  const statuses = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;
    return counts;
  }, [orders]);

  const pendingApprovals = useMemo(
    () => orders.filter((o) => o.approval_status === "pending" || o.status === "draft").length,
    [orders],
  );

  const totalOutstanding = useMemo(
    () => orders.filter((o) => o.balance > 0).reduce((s, o) => s + o.balance, 0),
    [orders],
  );

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.vendor.toLowerCase().includes(q) ||
          o.number.toLowerCase().includes(q) ||
          o.reference.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted text-[13px] animate-pulse">
        Loading purchase orders…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[rgba(255,75,110,0.3)] bg-[rgba(255,75,110,0.08)] px-6 py-4 text-[13px] text-[#ff4b6e]">
        Failed to load data: {error}. Run a manual sync or wait for the next scheduled sync.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subheader */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="text-[11px] text-text-muted">
          {data?.synced_at
            ? `Synced ${fmtDate(data.synced_at.slice(0, 10))}`
            : "No sync time"}
          {" · "}{data?.year ?? "—"}
        </span>
        <SyncButton />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(statuses).map(([status, count]) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            style={{ background: STATUS_META[status]?.color ?? "rgba(255,255,255,0.04)" }}
            className={[
              "rounded-xl border px-4 py-3 text-left transition-all",
              statusFilter === status
                ? "border-accent ring-2 ring-accent/20"
                : "border-border hover:border-border-bright",
            ].join(" ")}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-1"
              style={{ color: STATUS_TEXT[status] ?? "#8888aa" }}
            >
              {STATUS_META[status]?.label ?? status}
            </div>
            <div className="text-2xl font-bold text-text">{count}</div>
          </button>
        ))}

        {/* Outstanding balance */}
        <div className="rounded-xl border border-border bg-surface px-4 py-3 sm:col-span-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
            Outstanding Balance
          </div>
          <div className="text-2xl font-bold text-[#ff8c42]">{fmt(totalOutstanding)}</div>
        </div>

        {/* Pending approvals */}
        {pendingApprovals > 0 && (
          <div className="rounded-xl border border-[rgba(255,75,110,0.3)] bg-[rgba(255,75,110,0.08)] px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#ff4b6e] mb-1">
              Pending Approval
            </div>
            <div className="text-2xl font-bold text-[#ff4b6e]">{pendingApprovals}</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search vendor or PO#…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg bg-surface-2 border border-border-bright px-3 py-2 text-[12px] text-text placeholder:text-text-dim outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 w-56"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg bg-surface-2 border border-border-bright px-3 py-2 text-[12px] text-text outline-none focus:border-accent"
        >
          <option value="all">All statuses</option>
          {Object.keys(statuses).map((s) => (
            <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
          ))}
        </select>
        <span className="text-[11px] text-text-muted ml-auto">
          {filtered.length} of {orders.length} orders
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[700px] text-[12px]">
          <thead>
            <tr className="border-b border-border bg-surface">
              {["PO #", "Date", "Vendor", "Status", "Delivery Date", "Total", "Balance"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  No orders match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-semibold text-text whitespace-nowrap">{o.number}</td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDate(o.date)}</td>
                  <td className="px-4 py-3 text-text max-w-[180px] truncate">{o.vendor || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{
                        background: STATUS_META[o.status]?.color ?? "rgba(255,255,255,0.06)",
                        color:      STATUS_TEXT[o.status] ?? "#8888aa",
                      }}
                    >
                      {STATUS_META[o.status]?.label ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDate(o.delivery_date)}</td>
                  <td className="px-4 py-3 text-text whitespace-nowrap text-right">{fmt(o.total)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-semibold"
                    style={{ color: o.balance > 0 ? "#ff8c42" : "#10d98a" }}>
                    {fmt(o.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
