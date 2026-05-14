/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Order Process Dashboard — imperative DOM logic.
 * Called by OrderProcessClient inside a useEffect once the skeleton is mounted.
 * Data lives at /data/crm/orders.json — written by scripts/fetch_zoho_crm_orders.py.
 */

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CRM_BASE = "https://crm.zoho.com/crm/org878871386/tab/Potentials";

// ── Stage metadata ─────────────────────────────────────────────────────────────
const STAGE_META: Record<string, { cls: string; order: number }> = {
  "Therapist's request":                 { cls: "s-intake", order: 1 },
  "Private Sale / Government Tender":    { cls: "s-intake", order: 2 },
  "In production":                       { cls: "s-active", order: 3 },
  "Therapist's To Issue":                { cls: "s-active", order: 4 },
  "Picked & Packed":                     { cls: "s-active", order: 5 },
  "Ready for donation collection":       { cls: "s-active", order: 6 },
  "With External Therapists - To Issue": { cls: "s-active", order: 7 },
  "Out With Therapist's":                { cls: "s-active", order: 8 },
  "Received Feedback Form":              { cls: "s-done",   order: 9 },
  "Spontaneous Issue":                   { cls: "s-done",   order: 10 },
  "On hold":                             { cls: "s-hold",   order: 11 },
  "Issued":                              { cls: "s-done",   order: 12 },
  "Canceled":                            { cls: "s-cancel", order: 13 },
};

const PILL_CLASS: Record<string, string> = {
  "s-intake": "sp-intake",
  "s-active": "sp-active",
  "s-hold":   "sp-hold",
  "s-done":   "sp-done",
  "s-cancel": "sp-cancel",
};

// ── Order type metadata ────────────────────────────────────────────────────────
const TYPE_META: Record<string, { dot: string; badge: string }> = {
  "Private Sale / Government Tender": { dot: "t-private",     badge: "tb-private"     },
  "Internal Donation":                { dot: "t-internal",    badge: "tb-internal"    },
  "External Donation":                { dot: "t-external",    badge: "tb-external"    },
  "Spontaneous Issue":                { dot: "t-spontaneous", badge: "tb-spontaneous" },
};

// ── Data types ─────────────────────────────────────────────────────────────────
interface Order {
  id:              string;
  name:            string;
  customer:        string;
  order_type:      string;
  stage:           string;
  referral_source: string;
  created_date:    string;
  closing_date:    string | null;
}

interface OrdersFile {
  synced_at: string;
  orders:    Order[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function esc(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${parseInt(day, 10)} ${MONTH_NAMES[parseInt(m, 10) - 1].slice(0, 3)} ${y}`;
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function fmtTs(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `Last synced: ${d.toLocaleString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg",
  })} SAST`;
}

function stageClass(stage: string): string {
  return STAGE_META[stage]?.cls ?? "s-active";
}

function stagePill(stage: string): string {
  const cls = PILL_CLASS[stageClass(stage)] ?? "sp-active";
  return `<span class="stage-pill ${cls}">${esc(stage)}</span>`;
}

function typeBadge(t: string): string {
  const cls = TYPE_META[t]?.badge ?? "tb-other";
  return `<span class="type-badge ${cls}">${esc(t || "—")}</span>`;
}

function niceMax(v: number): number {
  if (v <= 0) return 5;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 5, 10]) if (m * exp >= v) return m * exp;
  return Math.ceil(v / exp) * exp;
}

function computeTicks(yMax: number): number[] {
  const rawStep = yMax / 4;
  const exp = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  let step = exp;
  for (const m of [1, 2, 5, 10]) { if (m * exp >= rawStep) { step = m * exp; break; } }
  const ticks: number[] = [];
  for (let v = 0; v <= yMax + step * 0.01; v += step) ticks.push(Math.round(v));
  return ticks;
}

function buildBarChart(
  points: { label: string; month: string; count: number }[],
  fillClass: string,
  tooltipLabel: string,
): string {
  if (!points.length) return `<p class="op-empty">No data</p>`;
  const maxVal = Math.max(...points.map((p) => p.count), 1);
  const yMax   = niceMax(maxVal);
  const ticks  = computeTicks(yMax);

  const yLabels   = ticks.map((v) => `<span class="y-label" style="bottom:calc(${(v/yMax*100).toFixed(2)}% - 7px)">${v}</span>`).join("");
  const gridLines = ticks.map((v) => `<div class="grid-line" style="bottom:${(v/yMax*100).toFixed(2)}%"></div>`).join("");

  const bars = points.map((p) => {
    const pct = (p.count / yMax * 100).toFixed(2);
    return `<div class="bar-col">
      <div class="bar-block" style="height:${pct}%">
        <div class="${fillClass}"></div>
      </div>
      <div class="bar-tooltip">${tooltipLabel}: <strong>${p.count}</strong><br><span style="color:#8888aa;font-size:10px">${esc(p.label)}</span></div>
    </div>`;
  }).join("");

  const xLabels = points.map((p) => {
    const [y, mo] = p.month.split("-");
    return `<div class="x-label">${MONTH_NAMES[parseInt(mo, 10) - 1].slice(0, 3)} '${y.slice(2)}</div>`;
  }).join("");

  return `<div class="chart-wrap">
    <div class="chart-y-axis">${yLabels}</div>
    <div class="chart-inner">
      <div class="chart-bars-zone">${gridLines}<div class="chart-bars-row">${bars}</div></div>
      <div class="chart-x-row">${xLabels}</div>
    </div>
  </div>`;
}

// ── Views ──────────────────────────────────────────────────────────────────────

function renderPipeline(orders: Order[]): string {
  const active   = orders.filter((o) => o.stage !== "Issued" && o.stage !== "Canceled");
  const issued   = orders.filter((o) => o.stage === "Issued");
  const onHold   = orders.filter((o) => o.stage === "On hold");
  const canceled = orders.filter((o) => o.stage === "Canceled");

  const kpis = `
    <div class="kpi-row op-animate">
      <div class="kpi-card c-active">
        <div class="kpi-num">${active.length}</div>
        <div class="kpi-label">Active Orders</div>
        <div class="kpi-sub">In progress</div>
      </div>
      <div class="kpi-card c-issued">
        <div class="kpi-num">${issued.length}</div>
        <div class="kpi-label">Issued</div>
        <div class="kpi-sub">Completed</div>
      </div>
      <div class="kpi-card c-hold">
        <div class="kpi-num">${onHold.length}</div>
        <div class="kpi-label">On Hold</div>
        <div class="kpi-sub">Paused</div>
      </div>
      <div class="kpi-card c-cancel">
        <div class="kpi-num">${canceled.length}</div>
        <div class="kpi-label">Canceled</div>
        <div class="kpi-sub">All time</div>
      </div>
    </div>`;

  const byStage: Record<string, Order[]> = {};
  orders.forEach((o) => {
    byStage[o.stage] = byStage[o.stage] ?? [];
    byStage[o.stage].push(o);
  });

  const allStages = Object.keys(STAGE_META).sort((a, b) =>
    (STAGE_META[a]?.order ?? 99) - (STAGE_META[b]?.order ?? 99),
  );

  const stageCards = allStages.map((stage) => {
    const list  = byStage[stage] ?? [];
    const cls   = stageClass(stage);
    const empty = list.length === 0 ? " s-empty" : "";
    const shown = list.slice(0, 3);
    const extra = list.length > 3 ? list.length - 3 : 0;
    const names = shown.map((o) => `<span>${esc(o.name || o.customer || "—")}</span>`).join("");
    const moreTag = extra > 0 ? `<span class="more">+${extra} more</span>` : "";
    return `
      <div class="stage-card ${cls}${empty}">
        <div class="stage-count">${list.length}</div>
        <div class="stage-name">${esc(stage)}</div>
        ${list.length > 0 ? `<div class="stage-names-list">${names}${moreTag}</div>` : ""}
      </div>`;
  }).join("");

  // Derive types from actual data
  const typeCount: Record<string, number> = {};
  orders.forEach((o) => { if (o.order_type) typeCount[o.order_type] = (typeCount[o.order_type] ?? 0) + 1; });
  const uniqueTypes = Object.keys(typeCount).sort((a, b) => typeCount[b] - typeCount[a]);

  const typeCards = uniqueTypes.map((t) => {
    const tOrders = orders.filter((o) => o.order_type === t);
    const tIssued = tOrders.filter((o) => o.stage === "Issued").length;
    const tActive = tOrders.filter((o) => o.stage !== "Issued" && o.stage !== "Canceled").length;
    const meta    = TYPE_META[t] ?? { dot: "t-other", badge: "tb-other" };
    return `
      <div class="type-card">
        <div class="type-dot ${meta.dot}"></div>
        <div class="type-name">${esc(t)}</div>
        <div class="type-counts">
          <div class="tc-total">${tOrders.length}</div>
          <div class="tc-sub">${tActive} active · ${tIssued} issued</div>
        </div>
      </div>`;
  }).join("");

  return `
    ${kpis}
    <div class="pipeline-layout op-animate">
      <div>
        <div class="section-eyebrow">Pipeline</div>
        <div class="section-title">Orders by Stage</div>
        <div class="section-divider"></div>
        <div class="stage-grid">${stageCards}</div>
      </div>
      <div>
        <div class="section-eyebrow">Breakdown</div>
        <div class="section-title">By Order Type</div>
        <div class="section-divider"></div>
        <div class="type-panel">${typeCards || `<p class="op-empty">No data</p>`}</div>
      </div>
    </div>`;
}

function renderOrders(
  orders: Order[],
  filterType: string,
  filterStage: string,
  filterReferral: string,
  filterYear: string,
  filterMonth: string,
  search: string,
): string {
  let filtered = orders;

  if (filterType)     filtered = filtered.filter((o) => o.order_type === filterType);
  if (filterStage)    filtered = filtered.filter((o) => o.stage === filterStage);
  if (filterReferral) filtered = filtered.filter((o) => o.referral_source === filterReferral);
  if (filterYear && filterMonth) {
    filtered = filtered.filter((o) => o.created_date?.slice(0, 7) === `${filterYear}-${filterMonth}`);
  } else if (filterYear) {
    filtered = filtered.filter((o) => o.created_date?.startsWith(filterYear + "-"));
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((o) =>
      o.name.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q),
    );
  }

  filtered = [...filtered].sort((a, b) => (b.created_date ?? "").localeCompare(a.created_date ?? ""));

  // Derive filter options from the full dataset
  const uniqueTypes = [...new Set(orders.map((o) => o.order_type).filter(Boolean))].sort();
  const typeOptions = uniqueTypes.map((t) =>
    `<option value="${esc(t)}"${filterType === t ? " selected" : ""}>${esc(t)}</option>`,
  ).join("");

  const allStagesSorted = Object.keys(STAGE_META).sort((a, b) =>
    (STAGE_META[a]?.order ?? 99) - (STAGE_META[b]?.order ?? 99),
  );
  const stageOptions = allStagesSorted.map((s) =>
    `<option value="${esc(s)}"${filterStage === s ? " selected" : ""}>${esc(s)}</option>`,
  ).join("");

  const uniqueReferrals = [...new Set(orders.map((o) => o.referral_source).filter(Boolean))].sort();
  const referralOptions = uniqueReferrals.map((r) =>
    `<option value="${esc(r)}"${filterReferral === r ? " selected" : ""}>${esc(r)}</option>`,
  ).join("");

  const uniqueYears = [...new Set(
    orders.map((o) => o.created_date?.slice(0, 4)).filter(Boolean) as string[],
  )].sort().reverse();
  const yearOptions = uniqueYears.map((y) =>
    `<option value="${esc(y)}"${filterYear === y ? " selected" : ""}>${esc(y)}</option>`,
  ).join("");

  const monthsForYear = filterYear
    ? ([...new Set(
        orders
          .filter((o) => o.created_date?.startsWith(filterYear + "-"))
          .map((o) => o.created_date?.slice(5, 7))
          .filter(Boolean) as string[],
      )].sort())
    : [];
  const monthOptions = monthsForYear.map((m) =>
    `<option value="${esc(m)}"${filterMonth === m ? " selected" : ""}>${esc(MONTH_NAMES[parseInt(m, 10) - 1])}</option>`,
  ).join("");

  const rows = filtered.length === 0
    ? `<tr><td colspan="8" style="text-align:center;padding:32px;color:#8888aa">No orders match the current filters</td></tr>`
    : filtered.map((o) => `
        <tr>
          <td class="td-name" title="${esc(o.name)}">${esc(o.name || "—")}</td>
          <td class="td-customer" title="${esc(o.customer)}">${esc(o.customer || "—")}</td>
          <td>${typeBadge(o.order_type)}</td>
          <td>${stagePill(o.stage)}</td>
          <td class="td-referral" title="${esc(o.referral_source)}">${esc(o.referral_source || "—")}</td>
          <td style="white-space:nowrap">${esc(fmtDate(o.created_date))}</td>
          <td style="white-space:nowrap">${esc(fmtDate(o.closing_date))}</td>
          <td>
            <a class="crm-link" href="${CRM_BASE}/${esc(o.id)}" target="_blank" rel="noopener noreferrer" title="Open in Zoho CRM">↗</a>
          </td>
        </tr>`).join("");

  return `
    <div class="table-controls op-animate">
      <input  class="op-search"  id="op-search-input"    type="search" placeholder="Search by name or customer…" value="${esc(search)}">
      <select class="op-select"  id="op-filter-type">
        <option value="">All types</option>${typeOptions}
      </select>
      <select class="op-select"  id="op-filter-stage">
        <option value="">All stages</option>${stageOptions}
      </select>
      <select class="op-select"  id="op-filter-referral">
        <option value="">All referral sources</option>${referralOptions}
      </select>
      <select class="op-select"  id="op-filter-year">
        <option value="">All years</option>${yearOptions}
      </select>
      <select class="op-select"  id="op-filter-month"${!filterYear ? ' disabled style="opacity:0.45"' : ''}>
        <option value="">All months</option>${monthOptions}
      </select>
      <span class="table-count">${filtered.length} order${filtered.length !== 1 ? "s" : ""}</span>
    </div>
    <div class="op-table-wrap op-animate">
      <table class="op-table">
        <thead>
          <tr>
            <th>Order Name</th>
            <th>Customer</th>
            <th>Type</th>
            <th>Stage</th>
            <th>Referral Source</th>
            <th>Created Date</th>
            <th>Closing Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderTrends(orders: Order[]): string {
  const placedMap: Record<string, number> = {};
  const closedMap: Record<string, number> = {};

  orders.forEach((o) => {
    if (o.created_date && o.created_date.length >= 7) {
      const ym = o.created_date.slice(0, 7);
      placedMap[ym] = (placedMap[ym] ?? 0) + 1;
    }
    if (o.closing_date && o.closing_date.length >= 7) {
      const ym = o.closing_date.slice(0, 7);
      closedMap[ym] = (closedMap[ym] ?? 0) + 1;
    }
  });

  const allMonths = [...new Set([...Object.keys(placedMap), ...Object.keys(closedMap)])].sort();

  const placedPoints = allMonths.map((ym) => ({ month: ym, label: fmtMonth(ym), count: placedMap[ym] ?? 0 }));
  const closedPoints = allMonths.map((ym) => ({ month: ym, label: fmtMonth(ym), count: closedMap[ym] ?? 0 }));

  const placedChart = buildBarChart(placedPoints, "bar-fill-accent", "Orders placed");
  const closedChart = buildBarChart(closedPoints, "bar-fill-green",  "Orders closed");

  const typeCount: Record<string, number> = {};
  orders.forEach((o) => {
    const t = o.order_type || "Unknown";
    typeCount[t] = (typeCount[t] ?? 0) + 1;
  });
  const typeSorted = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
  const maxType    = typeSorted[0]?.[1] ?? 1;

  const typeRows = typeSorted.map(([t, count]) => {
    const meta = TYPE_META[t] ?? { dot: "t-other", badge: "tb-other" };
    const pct  = (count / maxType * 100).toFixed(1);
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div class="type-dot ${meta.dot}" style="flex-shrink:0"></div>
        <div style="flex:1;font-size:12px;color:#c8c8d8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t)}</div>
        <div style="width:120px;height:6px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;flex-shrink:0">
          <div style="height:100%;width:${pct}%;background:var(--gradient);border-radius:4px;min-width:3px"></div>
        </div>
        <div style="font-size:12px;font-weight:700;color:#f0f0f8;flex-shrink:0;min-width:22px;text-align:right">${count}</div>
      </div>`;
  }).join("");

  return `
    <div class="trends-layout op-animate">
      <div class="trend-section">
        <div class="section-eyebrow">Volume</div>
        <div class="section-title">Orders Entered per Month</div>
        <div class="section-divider"></div>
        ${placedChart}
      </div>
      <div class="trend-section">
        <div class="section-eyebrow">Completion</div>
        <div class="section-title">Orders Closed per Month</div>
        <div class="section-divider"></div>
        ${closedChart}
      </div>
    </div>
    <div class="trend-section op-animate" style="max-width:540px">
      <div class="section-eyebrow">Breakdown</div>
      <div class="section-title">By Order Type</div>
      <div class="section-divider"></div>
      ${typeRows || `<p class="op-empty">No data</p>`}
    </div>`;
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────
export function initOrderDashboard() {
  const now = new Date();
  let allOrders: Order[] = [];
  let currentView: "pipeline" | "orders" | "trends" = "pipeline";
  let filterType     = "";
  let filterStage    = "";
  let filterReferral = "";
  let filterYear     = String(now.getFullYear());
  let filterMonth    = String(now.getMonth() + 1).padStart(2, "0");
  let searchTerm     = "";

  const content = () => document.getElementById("op-content")!;

  function setView(v: typeof currentView) {
    currentView = v;
    (["pipeline", "orders", "trends"] as const).forEach((id) => {
      document.getElementById(`btn-${id}`)?.classList.toggle("active", id === v);
    });
    render();
  }

  function render() {
    if      (currentView === "pipeline") content().innerHTML = renderPipeline(allOrders);
    else if (currentView === "orders")   content().innerHTML = renderOrders(allOrders, filterType, filterStage, filterReferral, filterYear, filterMonth, searchTerm);
    else                                  content().innerHTML = renderTrends(allOrders);
    wireFilters();
  }

  function wireFilters() {
    const searchEl   = document.getElementById("op-search-input")   as HTMLInputElement  | null;
    const typeEl     = document.getElementById("op-filter-type")     as HTMLSelectElement | null;
    const stageEl    = document.getElementById("op-filter-stage")    as HTMLSelectElement | null;
    const referralEl = document.getElementById("op-filter-referral") as HTMLSelectElement | null;
    const yearEl     = document.getElementById("op-filter-year")     as HTMLSelectElement | null;
    const monthEl    = document.getElementById("op-filter-month")    as HTMLSelectElement | null;

    const rerender = () => {
      content().innerHTML = renderOrders(allOrders, filterType, filterStage, filterReferral, filterYear, filterMonth, searchTerm);
      wireFilters();
    };

    searchEl?.addEventListener("input", (e) => {
      searchTerm = (e.target as HTMLInputElement).value;
      rerender();
    });
    typeEl?.addEventListener("change", (e) => {
      filterType = (e.target as HTMLSelectElement).value;
      rerender();
    });
    stageEl?.addEventListener("change", (e) => {
      filterStage = (e.target as HTMLSelectElement).value;
      rerender();
    });
    referralEl?.addEventListener("change", (e) => {
      filterReferral = (e.target as HTMLSelectElement).value;
      rerender();
    });
    yearEl?.addEventListener("change", (e) => {
      filterYear  = (e.target as HTMLSelectElement).value;
      filterMonth = ""; // reset month when year changes
      rerender();
    });
    monthEl?.addEventListener("change", (e) => {
      filterMonth = (e.target as HTMLSelectElement).value;
      rerender();
    });
  }

  async function init() {
    try {
      const resp = await fetch(`/data/crm/orders.json?_=${Date.now()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: OrdersFile = await resp.json();
      allOrders = data.orders ?? [];
      document.getElementById("op-synced")!.textContent = fmtTs(data.synced_at);
    } catch (e: any) {
      content().innerHTML = `<div class="op-error">Failed to load order data: ${esc(e.message)}<br><br>No data available yet — trigger the GitHub Action (workflow_dispatch) to run the first orders sync.</div>`;
      return;
    }
    render();
  }

  document.getElementById("btn-pipeline")?.addEventListener("click", () => setView("pipeline"));
  document.getElementById("btn-orders")  ?.addEventListener("click", () => setView("orders"));
  document.getElementById("btn-trends")  ?.addEventListener("click", () => setView("trends"));

  init();
}
