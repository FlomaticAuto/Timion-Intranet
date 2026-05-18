"use client";

import { useEffect, useMemo, useState } from "react";
import { SyncButton } from "@/components/SyncButton";

interface SalesOrder {
  id:              string;
  number:          string;
  reference:       string;
  date:            string;
  shipment_date:   string;
  customer:        string;
  status:          string;
  approval_status: string;
  total:           number;
  balance:         number;
  currency:        string;
  crm_deal_id:     string;
}

interface DataFile {
  synced_at: string;
  year:      number;
  orders:    SalesOrder[];
}

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  draft:     { label: "Draft",     bg: "rgba(255,140,66,0.14)",  text: "#ff8c42" },
  confirmed: { label: "Confirmed", bg: "rgba(79,142,247,0.14)",  text: "#4f8ef7" },
  fulfilled: { label: "Fulfilled", bg: "rgba(16,217,138,0.12)",  text: "#10d98a" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt = (n: number) =>
  "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `R ${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `R ${(n / 1_000).toFixed(1)}k`
  : fmt(n);

const fmtDate = (s: string) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s; }
};

const monthLabel = (ym: string) => {
  const [, m] = ym.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${ym.slice(2, 4)}`;
};

function parseCrmId(order: SalesOrder): string {
  if (order.crm_deal_id) return order.crm_deal_id;
  const ref = order.reference ?? "";
  if (ref.startsWith("CRM Deal ")) return ref.slice(9).trim();
  return "";
}

const CHART_H = 80;

function BarChart({ bars }: { bars: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="flex items-end gap-1.5">
      {bars.map((b) => {
        const barH = b.value > 0 ? Math.max(Math.round((b.value / max) * CHART_H), 4) : 0;
        return (
          <div key={b.label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="text-[9px] text-text-muted font-semibold" style={{ height: 14 }}>
              {b.value > 0 ? b.value : ""}
            </span>
            <div
              className="w-full rounded-t-sm bg-accent/70"
              style={{ height: barH }}
            />
            <span className="text-[9px] text-text-dim truncate w-full text-center leading-tight">
              {b.label}
              {b.sub && <><br /><span className="text-[8px]">{b.sub}</span></>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function SalesOrderClient() {
  const [data,        setData]        = useState<DataFile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [view,        setView]        = useState<"table" | "analytics">("table");
  const [status,      setStatus]      = useState("all");
  const [yearFilter,  setYearFilter]  = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [search,      setSearch]      = useState("");

  useEffect(() => {
    fetch("/data/salesorders.json")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const orders = useMemo(() => data?.orders ?? [], [data]);

  const years = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) if (o.date) s.add(o.date.slice(0, 4));
    return [...s].sort().reverse();
  }, [orders]);

  const months = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) {
      if (yearFilter !== "all" && !o.date.startsWith(yearFilter)) continue;
      if (o.date) s.add(o.date.slice(0, 7));
    }
    return [...s].sort();
  }, [orders, yearFilter]);

  // Reset month when year changes
  const handleYearChange = (y: string) => {
    setYearFilter(y);
    setMonthFilter("all");
  };

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  // Date + status filtered (used for analytics and as base for table)
  const dateStatusFiltered = useMemo(() => {
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (yearFilter !== "all" && !o.date.startsWith(yearFilter)) return false;
      if (monthFilter !== "all" && !o.date.startsWith(monthFilter)) return false;
      return true;
    });
  }, [orders, status, yearFilter, monthFilter]);

  // Table rows — additionally filtered by search
  const filtered = useMemo(() => {
    if (!search) return dateStatusFiltered;
    const q = search.toLowerCase();
    return dateStatusFiltered.filter((o) =>
      o.customer.toLowerCase().includes(q) ||
      o.number.toLowerCase().includes(q) ||
      o.reference.toLowerCase().includes(q)
    );
  }, [dateStatusFiltered, search]);

  const outstanding = useMemo(() => dateStatusFiltered.reduce((s, o) => s + o.balance, 0), [dateStatusFiltered]);
  const totalValue  = useMemo(() => dateStatusFiltered.reduce((s, o) => s + o.total, 0), [dateStatusFiltered]);

  const monthly = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    for (const o of dateStatusFiltered) {
      const key = o.date.slice(0, 7);
      if (!map[key]) map[key] = { count: 0, value: 0 };
      map[key].count++;
      map[key].value += o.total;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ key: k, label: monthLabel(k), count: v.count, value: v.value }));
  }, [dateStatusFiltered]);

  const topCustomers = useMemo(() => {
    const map: Record<string, { count: number; value: number; balance: number }> = {};
    for (const o of dateStatusFiltered) {
      const k = o.customer || "Unknown";
      if (!map[k]) map[k] = { count: 0, value: 0, balance: 0 };
      map[k].count++;
      map[k].value += o.total;
      map[k].balance += o.balance;
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b.value - a.value)
      .slice(0, 10)
      .map(([name, v]) => ({ name, ...v }));
  }, [dateStatusFiltered]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-text-muted text-[13px] animate-pulse">
      Loading sales orders…
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-[rgba(255,75,110,0.3)] bg-[rgba(255,75,110,0.08)] px-6 py-4 text-[13px] text-[#ff4b6e]">
      Failed to load data: {error}. Run a manual sync or wait for the next scheduled sync.
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Subheader */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="text-[11px] text-text-muted">
          {data?.synced_at ? `Synced ${fmtDate(data.synced_at.slice(0, 10))}` : "No sync time"}
          {" · "}{orders.length} orders · {data?.year ?? "—"}
        </span>
        <div className="flex items-center gap-3">
          <SyncButton />
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["table", "analytics"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={[
                  "px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
                  view === v ? "bg-accent text-white" : "text-text-muted hover:text-text hover:bg-surface-2",
                ].join(" ")}
              >
                {v === "table" ? "Orders" : "Analytics"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Headline metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Total Orders</div>
          <div className="text-2xl font-bold text-text">{dateStatusFiltered.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Total Value</div>
          <div className="text-xl font-bold text-text">{fmtShort(totalValue)}</div>
        </div>
        <div className="rounded-xl border border-[rgba(255,140,66,0.3)] bg-[rgba(255,140,66,0.06)] px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber mb-1">Outstanding</div>
          <div className="text-xl font-bold text-amber">{fmtShort(outstanding)}</div>
        </div>
        <div className="rounded-xl border border-[rgba(79,142,247,0.3)] bg-[rgba(79,142,247,0.06)] px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#4f8ef7] mb-1">Confirmed</div>
          <div className="text-2xl font-bold text-[#4f8ef7]">
            {dateStatusFiltered.filter((o) => o.status === "confirmed").length}
          </div>
        </div>
      </div>

      {/* Date + status filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Year */}
        <select
          value={yearFilter}
          onChange={(e) => handleYearChange(e.target.value)}
          className="rounded-lg bg-surface-2 border border-border-bright px-3 py-1.5 text-[12px] text-text outline-none focus:border-accent"
        >
          <option value="all">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {/* Month */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-lg bg-surface-2 border border-border-bright px-3 py-1.5 text-[12px] text-text outline-none focus:border-accent"
        >
          <option value="all">All months</option>
          {months.map((ym) => (
            <option key={ym} value={ym}>{monthLabel(ym)}</option>
          ))}
        </select>

        {/* Status tabs */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            type="button"
            onClick={() => setStatus("all")}
            className={[
              "px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
              status === "all" ? "bg-surface-2 text-text" : "text-text-muted hover:text-text",
            ].join(" ")}
          >
            All ({orders.length})
          </button>
          {Object.entries(statusCounts).map(([s, n]) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(status === s ? "all" : s)}
              className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors border-l border-border"
              style={{
                background: status === s ? (STATUS_META[s]?.bg ?? "rgba(255,255,255,0.06)") : "transparent",
                color: status === s ? (STATUS_META[s]?.text ?? "#f0f0f8") : "#8888aa",
              }}
            >
              {STATUS_META[s]?.label ?? s} ({n})
            </button>
          ))}
        </div>

        {view === "table" && (
          <input
            type="search"
            placeholder="Search customer or SO#…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg bg-surface-2 border border-border-bright px-3 py-1.5 text-[12px] text-text placeholder:text-text-dim outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 w-52 ml-auto"
          />
        )}
      </div>

      {/* ─── TABLE VIEW ─────────────────────────────────── */}
      {view === "table" && (
        <div className="space-y-3">
          <div className="text-[11px] text-text-muted">{filtered.length} of {orders.length} orders</div>

          <div className="rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[700px] text-[12px]">
              <thead>
                <tr className="border-b border-border bg-surface">
                  {["SO #", "Date", "Customer", "Status", "Total", "Balance", "CRM"].map((h) => (
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
                ) : filtered.map((o) => {
                  const crmId = parseCrmId(o);
                  const meta  = STATUS_META[o.status];
                  const soUrl = `https://inventory.zoho.com/app/timionnpc#/salesorders/${o.id}`;
                  return (
                    <tr
                      key={o.id}
                      className="border-t border-border hover:bg-surface-2 transition-colors cursor-pointer"
                      onClick={() => window.open(soUrl, "_blank", "noopener,noreferrer")}
                    >
                      <td className="px-4 py-3 font-semibold text-text whitespace-nowrap">{o.number}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDate(o.date)}</td>
                      <td className="px-4 py-3 text-text max-w-[200px] truncate" title={o.customer}>{o.customer || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                          style={{ background: meta?.bg ?? "rgba(255,255,255,0.06)", color: meta?.text ?? "#8888aa" }}
                        >
                          {meta?.label ?? o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text whitespace-nowrap text-right tabular-nums">{fmt(o.total)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums"
                        style={{ color: o.balance > 0 ? "#ff8c42" : "#10d98a" }}>
                        {fmt(o.balance)}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {crmId ? (
                          <a
                            href={`https://crm.zoho.com/crm/tab/Potentials/${crmId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-accent hover:underline text-[11px] font-semibold"
                            title="Open CRM deal"
                          >
                            CRM ↗
                          </a>
                        ) : (
                          <span className="text-text-dim text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ANALYTICS VIEW ─────────────────────────────── */}
      {view === "analytics" && (
        <div className="space-y-6">

          {/* Status breakdown */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-4">
              Orders by Status
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(
                dateStatusFiltered.reduce((acc, o) => {
                  acc[o.status] = (acc[o.status] ?? 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([s, n]) => {
                const meta = STATUS_META[s];
                const pct  = Math.round((n / Math.max(dateStatusFiltered.length, 1)) * 100);
                return (
                  <div
                    key={s}
                    className="flex-1 min-w-[120px] rounded-lg px-4 py-3 border border-border"
                    style={{ background: meta?.bg ?? "rgba(255,255,255,0.04)" }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: meta?.text ?? "#8888aa" }}>
                      {meta?.label ?? s}
                    </div>
                    <div className="text-3xl font-bold text-text">{n}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{pct}% of total</div>
                    <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta?.text ?? "#8888aa" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly trend */}
          {monthly.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                Monthly Order Count
              </h3>
              <p className="text-[11px] text-text-dim mb-4">Number of sales orders created per month</p>
              <BarChart bars={monthly.map((m) => ({ label: m.label, value: m.count }))} />
            </div>
          )}

          {/* Monthly value trend */}
          {monthly.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                Monthly Order Value (ZAR)
              </h3>
              <p className="text-[11px] text-text-dim mb-4">Total value of orders created per month</p>
              <BarChart bars={monthly.map((m) => ({ label: m.label, value: Math.round(m.value), sub: fmtShort(m.value) }))} />
            </div>
          )}

          {/* Top customers */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-4">
              Top Customers by Order Value
            </h3>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border">
                  {["Customer", "Orders", "Total Value", "Outstanding"].map((h) => (
                    <th key={h} className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c) => (
                  <tr key={c.name} className="border-t border-border">
                    <td className="py-2 pr-4 text-text font-medium max-w-[200px] truncate" title={c.name}>{c.name}</td>
                    <td className="py-2 pr-4 text-text-muted tabular-nums">{c.count}</td>
                    <td className="py-2 pr-4 text-text tabular-nums">{fmt(c.value)}</td>
                    <td className="py-2 font-semibold tabular-nums" style={{ color: c.balance > 0 ? "#ff8c42" : "#10d98a" }}>
                      {fmt(c.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CRM coverage */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
              CRM Deal Coverage
            </h3>
            {(() => {
              const linked = dateStatusFiltered.filter((o) => parseCrmId(o)).length;
              const pct    = Math.round((linked / Math.max(dateStatusFiltered.length, 1)) * 100);
              return (
                <>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-bold text-text">{linked}</span>
                    <span className="text-text-muted text-[13px] mb-1">of {dateStatusFiltered.length} orders linked to a CRM deal</span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[11px] text-text-muted mt-1">{pct}% CRM coverage</div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
