/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Equipment Ordered Dashboard — imperative DOM logic.
 * Data at /data/crm/equipment/*.json, written by scripts/fetch_zoho_crm_equipment.py.
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Status badge colours  [background, text]
const STATUS_STYLE: Record<string, [string, string]> = {
  "Therapist's request":              ["rgba(124,92,252,0.15)", "#a78bfa"],
  "Private Sale / Government Tender": ["rgba(124,92,252,0.15)", "#a78bfa"],
  "In production":                    ["rgba(79,142,247,0.15)",  "#4f8ef7"],
  "Therapist's To Issue":             ["rgba(79,142,247,0.15)",  "#4f8ef7"],
  "Picked & Packed":                  ["rgba(79,142,247,0.15)",  "#4f8ef7"],
  "With External Therapists - To Issue": ["rgba(79,142,247,0.15)", "#4f8ef7"],
  "Out With Therapist's":             ["rgba(79,142,247,0.15)",  "#4f8ef7"],
  "Ready for donation collection":    ["rgba(79,142,247,0.15)",  "#4f8ef7"],
  "On hold":                          ["rgba(255,140,66,0.15)",  "#ff8c42"],
  "Received Feedback Form":           ["rgba(16,217,138,0.12)",  "#10d98a"],
  "Spontaneous Issue":                ["rgba(16,217,138,0.12)",  "#10d98a"],
  "Issued":                           ["rgba(16,217,138,0.12)",  "#10d98a"],
  "Canceled":                         ["rgba(255,75,110,0.15)",  "#ff4b6e"],
};

// Approval Status badge colours
const APPROVAL_STYLE: Record<string, [string, string]> = {
  "Ready for Evaluation":             ["rgba(255,140,66,0.15)",  "#ff8c42"],
  "Needs Further Information":        ["rgba(249,115,22,0.15)",  "#f97316"],
  "Approved":                         ["rgba(16,217,138,0.12)",  "#10d98a"],
  "Converted to Order":               ["rgba(79,142,247,0.15)",  "#4f8ef7"],
  "Rejected":                         ["rgba(255,75,110,0.15)",  "#ff4b6e"],
  "Spontaneous Issue":                ["rgba(16,217,138,0.12)",  "#10d98a"],
  "Private Sale / Government Tender": ["rgba(124,92,252,0.15)", "#a78bfa"],
};

interface EquipmentRecord {
  id:              string;
  name:            string;
  patient:         string;
  device:          string;
  qty:             string;
  order_date:      string;
  approval_status: string;
  order_from:      string;
  status:          string;
}

interface MonthlyData {
  generated_at: string;
  month:        string;
  total:        number;
  items:        EquipmentRecord[];
}

export function initEquipmentDashboard() {
  let availableMonths: string[]     = [];
  let currentIndex                  = 0;
  let analyticsCache: any           = null;
  let currentView: "monthly" | "analytics" = "monthly";
  let currentMonthData: MonthlyData | null = null;
  let filterStatus   = "";
  let filterApproval = "";
  let searchTerm     = "";

  // ── Helpers ────────────────────────────────────────────────────────
  function formatMonth(ym: string) {
    const [y, m] = ym.split("-");
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${parseInt(d, 10)} ${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  }

  function formatTimestamp(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `Last synced: ${d.toLocaleString("en-ZA", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg",
    })} SAST`;
  }

  function esc(str: any) {
    return String(str ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function colorBadge(value: string, styleMap: Record<string, [string, string]>): string {
    const [bg, color] = styleMap[value] ?? ["rgba(255,255,255,0.07)", "#8888aa"];
    return `<span style="display:inline-block;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;background:${bg};color:${color};white-space:nowrap">${esc(value || "—")}</span>`;
  }

  const EQ_BASE = "https://crm.zoho.com/crm/org878871386/tab/Issued_Equipment";

  // ── Filter logic ───────────────────────────────────────────────────
  function applyFilters(items: EquipmentRecord[]): EquipmentRecord[] {
    return items.filter((item) => {
      if (filterStatus   && item.status          !== filterStatus)   return false;
      if (filterApproval && item.approval_status !== filterApproval) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!item.patient.toLowerCase().includes(q) &&
            !item.device.toLowerCase().includes(q)  &&
            !item.name.toLowerCase().includes(q))    return false;
      }
      return true;
    });
  }

  // ── Monthly view ───────────────────────────────────────────────────
  function renderChips(items: EquipmentRecord[]): string {
    const needsEval = items.filter((i) =>
      i.approval_status === "Ready for Evaluation" ||
      i.approval_status === "Needs Further Information",
    ).length;
    const approved = items.filter((i) =>
      i.approval_status === "Approved" ||
      i.approval_status === "Converted to Order",
    ).length;
    const issued = items.filter((i) => i.status === "Issued").length;

    return `<div class="summary-row">
      <div class="summary-chip v-total">
        <strong>${items.length}</strong>Total Orders
      </div>
      <div class="summary-chip v-locations">
        <strong>${needsEval}</strong>Needs Evaluation
      </div>
      <div class="summary-chip v-therapists">
        <strong>${approved}</strong>Approved
      </div>
      <div class="summary-chip v-types">
        <strong>${issued}</strong>Issued
      </div>
    </div>`;
  }

  function renderFilteredView(items: EquipmentRecord[]): string {
    const filtered = applyFilters(items);

    const uniqueStatuses  = [...new Set(items.map((i) => i.status).filter(Boolean))].sort();
    const uniqueApprovals = [...new Set(items.map((i) => i.approval_status).filter(Boolean))].sort();

    const selectStyle = "height:36px;background:#1a1a2e;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#f0f0f8;font-size:12px;font-family:inherit;padding:0 10px;cursor:pointer;outline:none";
    const inputStyle  = "flex:1;min-width:180px;height:36px;background:#1a1a2e;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#f0f0f8;font-size:13px;font-family:inherit;padding:0 12px;outline:none";

    const statusOpts   = uniqueStatuses.map((s) =>
      `<option value="${esc(s)}"${filterStatus === s ? " selected" : ""}>${esc(s)}</option>`,
    ).join("");
    const approvalOpts = uniqueApprovals.map((s) =>
      `<option value="${esc(s)}"${filterApproval === s ? " selected" : ""}>${esc(s)}</option>`,
    ).join("");

    const toolbar = `
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px">
        <input id="eq-search" type="text" placeholder="Search patient, device or name…"
               value="${esc(searchTerm)}" style="${inputStyle}" />
        <select id="eq-filter-status" style="${selectStyle}">
          <option value="">All statuses</option>${statusOpts}
        </select>
        <select id="eq-filter-approval" style="${selectStyle}">
          <option value="">All approval statuses</option>${approvalOpts}
        </select>
        <span style="font-size:11px;color:#8888aa;margin-left:auto">
          ${filtered.length} record${filtered.length !== 1 ? "s" : ""}
        </span>
      </div>`;

    if (filtered.length === 0) {
      return toolbar + `<p class="empty-state">No records match the current filters.</p>`;
    }

    const cards = filtered.map((item, idx) => `
      <div class="card" style="animation-delay:${(idx * 0.03).toFixed(2)}s">
        <div class="card-title">${esc(item.name || item.device || "Equipment")}</div>
        <div class="card-meta">
          <span data-label="Patient">${esc(item.patient || "—")}</span>
          <span data-label="Device">${esc(item.device || "—")}</span>
          <span data-label="Qty">${esc(item.qty || "—")}</span>
          <span data-label="Order Date">${esc(formatDate(item.order_date))}</span>
          <span data-label="Referral">${esc(item.order_from || "—")}</span>
        </div>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
          ${item.status          ? colorBadge(item.status,          STATUS_STYLE)   : ""}
          ${item.approval_status ? colorBadge(item.approval_status, APPROVAL_STYLE) : ""}
        </div>
        ${item.id ? `<div class="card-footer"><a class="zoho-link" href="${EQ_BASE}/${esc(item.id)}" target="_blank" rel="noopener noreferrer" title="Open in Zoho CRM">↗</a></div>` : ""}
      </div>`).join("");

    return toolbar + `<div class="card-grid">${cards}</div>`;
  }

  function renderDashboard(data: MonthlyData) {
    document.getElementById("eq-last-synced")!.textContent = formatTimestamp(data.generated_at);
    currentMonthData = data;
    renderAll();
  }

  function renderAll() {
    const items = currentMonthData?.items ?? [];
    document.getElementById("eq-main-content")!.innerHTML =
      renderChips(items) + renderFilteredView(items);
    wireFilters();
  }

  function wireFilters() {
    const searchEl   = document.getElementById("eq-search")          as HTMLInputElement   | null;
    const statusEl   = document.getElementById("eq-filter-status")   as HTMLSelectElement  | null;
    const approvalEl = document.getElementById("eq-filter-approval") as HTMLSelectElement  | null;

    searchEl?.addEventListener("input", (e) => {
      searchTerm = (e.target as HTMLInputElement).value;
      renderAll();
    });
    statusEl?.addEventListener("change", (e) => {
      filterStatus = (e.target as HTMLSelectElement).value;
      renderAll();
    });
    approvalEl?.addEventListener("change", (e) => {
      filterApproval = (e.target as HTMLSelectElement).value;
      renderAll();
    });
  }

  function renderError(msg: string) {
    document.getElementById("eq-main-content")!.innerHTML =
      `<div class="error-message">${esc(msg)}</div>`;
  }

  // ── Navigation ─────────────────────────────────────────────────────
  function updateNav() {
    const ym = availableMonths[currentIndex];
    if (!ym) return;
    const [year]        = ym.split("-");
    const years         = [...new Set(availableMonths.map((m) => m.split("-")[0]))];
    const monthsForYear = availableMonths.filter((m) => m.startsWith(year + "-"));

    const selYear  = document.getElementById("eq-sel-year")  as HTMLSelectElement;
    const selMonth = document.getElementById("eq-sel-month") as HTMLSelectElement;

    selYear.innerHTML = years.map((y) =>
      `<option value="${y}"${y === year ? " selected" : ""}>${y}</option>`,
    ).join("");
    selMonth.innerHTML = monthsForYear.map((m) => {
      const [, mm] = m.split("-");
      return `<option value="${m}"${m === ym ? " selected" : ""}>${MONTH_NAMES[parseInt(mm, 10) - 1]}</option>`;
    }).join("");

    (document.getElementById("eq-btn-prev") as HTMLButtonElement).disabled =
      currentIndex >= availableMonths.length - 1;
    (document.getElementById("eq-btn-next") as HTMLButtonElement).disabled =
      currentIndex <= 0;
  }

  async function loadMonth(ym: string) {
    document.getElementById("eq-main-content")!.innerHTML =
      `<div class="loading-overlay">Loading data…</div>`;
    try {
      const resp = await fetch(`/data/crm/equipment/${ym}.json?_=${Date.now()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      renderDashboard(data);
    } catch (e: any) {
      renderError(`Failed to load data for ${formatMonth(ym)}: ${e.message}`);
    }
  }

  // ── Analytics ──────────────────────────────────────────────────────
  async function loadAllMonths() {
    const results: Record<string, MonthlyData> = {};
    await Promise.all(
      availableMonths.map(async (ym) => {
        try {
          const r = await fetch(`/data/crm/equipment/${ym}.json?_=${Date.now()}`);
          if (r.ok) results[ym] = await r.json();
        } catch { /* ignore */ }
      }),
    );
    return results;
  }

  function computeAnalytics(allData: Record<string, MonthlyData>) {
    const months = [...availableMonths].reverse().filter((ym) => allData[ym]);
    const stats  = months.map((ym) => {
      const items = allData[ym].items || [];
      return { month: ym, label: formatMonth(ym), count: items.length, items };
    });

    const allItems   = stats.flatMap((m) => m.items);
    const totalCount = allItems.length;
    const current    = stats[stats.length - 1] || ({} as any);

    const cutoff90  = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const rolling90 = allItems.filter(
      (v) => v.order_date && new Date(v.order_date) >= cutoff90,
    ).length;

    const deviceMap: Record<string, number>   = {};
    const statusMap: Record<string, number>   = {};
    const approvalMap: Record<string, number> = {};
    const referralMap: Record<string, number> = {};

    allItems.forEach((v) => {
      if (v.device)          deviceMap[v.device]          = (deviceMap[v.device]          || 0) + 1;
      if (v.status)          statusMap[v.status]          = (statusMap[v.status]          || 0) + 1;
      if (v.approval_status) approvalMap[v.approval_status] = (approvalMap[v.approval_status] || 0) + 1;
      if (v.order_from)      referralMap[v.order_from]    = (referralMap[v.order_from]    || 0) + 1;
    });

    return {
      stats, totalCount, current, rolling90,
      deviceList:   Object.entries(deviceMap).sort((a, b) => b[1] - a[1]),
      statusList:   Object.entries(statusMap).sort((a, b) => b[1] - a[1]),
      approvalList: Object.entries(approvalMap).sort((a, b) => b[1] - a[1]),
      referralList: Object.entries(referralMap).sort((a, b) => b[1] - a[1]),
    };
  }

  function niceMax(val: number) {
    if (val <= 0) return 5;
    const exp = Math.pow(10, Math.floor(Math.log10(val)));
    for (const m of [1, 2, 5, 10]) { if (m * exp >= val) return m * exp; }
    return Math.ceil(val / exp) * exp;
  }

  function computeTicks(yMax: number) {
    const rawStep = yMax / 4;
    const exp = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    let step = exp;
    for (const m of [1, 2, 5, 10]) { if (m * exp >= rawStep) { step = m * exp; break; } }
    const ticks: number[] = [];
    for (let v = 0; v <= yMax + step * 0.01; v += step) ticks.push(Math.round(v));
    return ticks;
  }

  function buildBarChart(stats: any[]) {
    if (!stats.length) return `<p class="empty-state">No data</p>`;
    const maxVal = Math.max(...stats.map((m) => m.count), 1);
    const yMax   = niceMax(maxVal);
    const ticks  = computeTicks(yMax);

    const yLabels   = ticks.map((v) => `<span class="y-label" style="bottom:calc(${(v/yMax*100).toFixed(2)}% - 7px)">${v}</span>`).join("");
    const gridLines = ticks.map((v) => `<div class="grid-line" style="bottom:${(v/yMax*100).toFixed(2)}%"></div>`).join("");
    const barCols   = stats.map((m) => {
      const pct = (m.count / yMax * 100).toFixed(2);
      return `<div class="bar-col">
        <div class="bar-stack" style="height:${pct}%"><div class="bar-visit-seg"></div></div>
        <div class="bar-tooltip">Ordered: <strong>${m.count}</strong></div>
      </div>`;
    }).join("");
    const xLabels = stats.map((m) => {
      const [y, mo] = m.month.split("-");
      return `<div class="x-label">${MONTH_NAMES[parseInt(mo, 10) - 1].slice(0, 3)} '${y.slice(2)}</div>`;
    }).join("");

    return `<div class="chart-wrap">
      <div class="chart-y-axis">${yLabels}</div>
      <div class="chart-inner">
        <div class="chart-bars-zone">${gridLines}<div class="chart-bars-row">${barCols}</div></div>
        <div class="chart-x-row">${xLabels}</div>
      </div>
    </div>`;
  }

  function buildRankList(items: [string, number][], barClass = "") {
    if (!items.length) return `<p class="empty-state">No data available</p>`;
    const maxVal = items[0][1];
    return items.map(([name, count], i) => `
      <div class="rank-row">
        <span class="rank-circle${i < 3 ? " top" : ""}">${i + 1}</span>
        <span class="rank-name" title="${esc(name)}">${esc(name || "—")}</span>
        <div class="rank-bar-track">
          <div class="rank-bar-fill${barClass ? ` ${barClass}` : ""}"
               style="width:${(count / maxVal * 100).toFixed(1)}%"></div>
        </div>
        <span class="rank-val">${count}</span>
      </div>`).join("");
  }

  function renderAnalytics(a: any) {
    const last6     = a.stats.slice(-6);
    const curYear   = String(new Date().getFullYear());
    const yearStats = a.stats.filter((s: any) => s.month.startsWith(curYear));

    document.getElementById("eq-main-content")!.innerHTML = `
      <div class="a-section">
        <div class="a-eyebrow" style="margin-bottom:16px;">Overview</div>
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-value">${a.totalCount}</div>
            <div class="kpi-label">Total Ordered</div>
            <div class="kpi-sub">${a.stats.length} month${a.stats.length !== 1 ? "s" : ""} of data</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${a.current.count || 0}</div>
            <div class="kpi-label">Ordered This Month</div>
            <div class="kpi-sub">${a.current.label || "—"}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${a.deviceList.length}</div>
            <div class="kpi-label">Device Types</div>
            <div class="kpi-sub">All time</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${a.rolling90}</div>
            <div class="kpi-label">Last 90 Days</div>
            <div class="kpi-sub">Orders entered</div>
          </div>
        </div>
      </div>
      <div class="charts-row" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
        <div class="a-section" style="margin-bottom:0;">
          <div class="a-eyebrow">Trend</div>
          <div class="a-title">Last 6 Months</div>
          <div class="section-divider"></div>
          ${buildBarChart(last6)}
        </div>
        <div class="a-section" style="margin-bottom:0;">
          <div class="a-eyebrow">Annual Overview</div>
          <div class="a-title">${curYear}</div>
          <div class="section-divider"></div>
          ${buildBarChart(yearStats)}
        </div>
      </div>
      <div class="a-columns" style="grid-template-columns:1fr 1fr;">
        <div class="a-section">
          <div class="a-eyebrow">Equipment</div>
          <div class="a-title">By Device</div>
          <div class="section-divider"></div>
          <div class="rank-list">${buildRankList(a.deviceList)}</div>
        </div>
        <div class="a-section">
          <div class="a-eyebrow">Pipeline</div>
          <div class="a-title">By Status</div>
          <div class="section-divider"></div>
          <div class="rank-list">${buildRankList(a.statusList, "green")}</div>
        </div>
      </div>
      <div class="a-columns" style="grid-template-columns:1fr 1fr;">
        <div class="a-section">
          <div class="a-eyebrow">Approval</div>
          <div class="a-title">By Approval Status</div>
          <div class="section-divider"></div>
          <div class="rank-list">${buildRankList(a.approvalList, "amber")}</div>
        </div>
        <div class="a-section">
          <div class="a-eyebrow">Source</div>
          <div class="a-title">By Referral Source</div>
          <div class="section-divider"></div>
          <div class="rank-list">${buildRankList(a.referralList)}</div>
        </div>
      </div>`;
  }

  async function showAnalytics() {
    if (!analyticsCache) {
      document.getElementById("eq-main-content")!.innerHTML =
        `<div class="loading-overlay">Loading analytics…</div>`;
      analyticsCache = computeAnalytics(await loadAllMonths());
    }
    renderAnalytics(analyticsCache);
  }

  function showView(view: "monthly" | "analytics") {
    currentView = view;
    document.getElementById("eq-btn-view-monthly")!.classList.toggle("active",   view === "monthly");
    document.getElementById("eq-btn-view-analytics")!.classList.toggle("active", view === "analytics");
    const monthNav = document.querySelector<HTMLElement>(".visit-dashboard-root .month-nav");
    if (monthNav) monthNav.style.display = view === "monthly" ? "" : "none";
    if (view === "monthly") {
      if (currentMonthData) renderAll();
      else loadMonth(availableMonths[currentIndex]);
    } else {
      showAnalytics();
    }
  }

  // ── Bootstrap ──────────────────────────────────────────────────────
  async function init() {
    try {
      const resp = await fetch(`/data/crm/equipment/index.json?_=${Date.now()}`);
      if (resp.ok) availableMonths = await resp.json();
    } catch {
      availableMonths = [];
    }

    try {
      const resp = await fetch(`/data/crm/equipment/latest.json?_=${Date.now()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const idx    = availableMonths.indexOf(data.month);
      currentIndex = idx >= 0 ? idx : 0;
      if (availableMonths.length === 0 && data.month) availableMonths = [data.month];

      updateNav();
      renderDashboard(data);
    } catch (e: any) {
      updateNav();
      if (availableMonths.length === 0) {
        document.getElementById("eq-main-content")!.innerHTML =
          `<div class="error-message">No data available yet — trigger the GitHub Action to pull the first month of equipment data.</div>`;
      } else {
        renderError(`Could not load dashboard data: ${e.message}`);
      }
    }
  }

  // ── Wire up nav controls ───────────────────────────────────────────
  document.getElementById("eq-btn-view-monthly")!.addEventListener("click", () => {
    if (currentView !== "monthly") showView("monthly");
  });
  document.getElementById("eq-btn-view-analytics")!.addEventListener("click", () => {
    if (currentView !== "analytics") showView("analytics");
  });
  document.getElementById("eq-btn-prev")!.addEventListener("click", () => {
    if (currentIndex < availableMonths.length - 1) {
      currentIndex++;
      currentMonthData = null;
      updateNav();
      loadMonth(availableMonths[currentIndex]);
    }
  });
  document.getElementById("eq-btn-next")!.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      currentMonthData = null;
      updateNav();
      loadMonth(availableMonths[currentIndex]);
    }
  });
  document.getElementById("eq-sel-year")!.addEventListener("change", (e) => {
    const yr    = (e.target as HTMLSelectElement).value;
    const match = availableMonths.find((m) => m.startsWith(yr + "-"));
    if (match) {
      currentIndex     = availableMonths.indexOf(match);
      currentMonthData = null;
      updateNav();
      if (currentView === "monthly") loadMonth(availableMonths[currentIndex]);
    }
  });
  document.getElementById("eq-sel-month")!.addEventListener("change", (e) => {
    const idx = availableMonths.indexOf((e.target as HTMLSelectElement).value);
    if (idx >= 0) {
      currentIndex     = idx;
      currentMonthData = null;
      updateNav();
      if (currentView === "monthly") loadMonth(availableMonths[currentIndex]);
    }
  });

  init();
}
