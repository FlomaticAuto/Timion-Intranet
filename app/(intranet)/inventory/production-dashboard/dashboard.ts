/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Production Dashboard — imperative DOM logic.
 *
 * Ported verbatim from the standalone dashboard repo.
 * Fetch paths updated from `data/*.json` to `/data/*.json` since the JSON
 * files now live under /public/data/ in the intranet repo.
 *
 * Called by `DashboardClient` inside a `useEffect`, so by the time this
 * runs the JSX skeleton (with the expected element IDs) is already in
 * the DOM and the script just wires up handlers and fetches data.
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ASSEMBLY_BASE = "https://one.zoho.com/zohoone/timionnpc/home/cxapp/inventory/app/878382704#/inventory/assembly";

interface AssemblyRecord {
  id?:             string;
  assembly_number: string;
  item_name:       string;
  quantity:        number;
  date:            string;
  status:          string;
  production_staff: string[];
  serial_numbers:  string[];
  completed_date?: string;
}

interface MonthlyData {
  generated_at: string;
  month: string;
  finished_products: { in_production: AssemblyRecord[]; completed: AssemblyRecord[] };
  subassemblies:     { in_production: AssemblyRecord[]; completed: AssemblyRecord[] };
}

export function initDashboard() {
  let availableMonths: string[] = [];
  let currentIndex = 0;
  let analyticsCache: any = null;
  let currentView: "monthly" | "analytics" = "monthly";

  // ── Formatting helpers ─────────────────────────────────────────────
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

  function formatCompletedDate(val: string | undefined): string | null {
    if (!val) return null;
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      }
    } catch { /* ignore */ }
    const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${parseInt(m[3])} ${MONTH_NAMES[parseInt(m[2]) - 1]} ${m[1]}`;
    return String(val);
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
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Rendering ──────────────────────────────────────────────────────
  function renderCards(records: AssemblyRecord[]) {
    if (!records || records.length === 0) {
      return `<p class="empty-state">No records for this period</p>`;
    }
    return records.map((r, idx) => {
      const staff   = (r.production_staff || []).join(", ") || "—";
      const serials = (r.serial_numbers   || []).join(", ") || "—";
      const badge   = r.status === "draft"
        ? `<span class="status-badge draft">Draft</span>`
        : r.status === "confirmed"
          ? `<span class="status-badge confirmed">Confirmed</span>`
          : "";
      const completedSpan = r.completed_date
        ? `<span data-label="Completed">${esc(formatCompletedDate(r.completed_date))}</span>`
        : "";
      const zohoLink = r.id
        ? `<div class="card-footer"><a class="zoho-link" href="${ASSEMBLY_BASE}/${esc(r.id)}" target="_blank" rel="noopener noreferrer" title="Open in Zoho Inventory">↗</a></div>`
        : "";
      return `
        <div class="card" style="animation-delay:${(idx * 0.04).toFixed(2)}s">
          <div class="card-title">${esc(r.item_name)}${badge}</div>
          <div class="card-meta">
            <span data-label="Order">${esc(r.assembly_number)}</span>
            <span data-label="Qty">${esc(String(r.quantity))}</span>
            <span data-label="Started">${esc(formatDate(r.date))}</span>
            ${completedSpan}
            <span data-label="Staff">${esc(staff)}</span>
          </div>
          <div class="card-meta" style="margin-top:6px;">
            <span data-label="Serials">${esc(serials)}</span>
          </div>
          ${zohoLink}
        </div>
      `;
    }).join("");
  }

  function renderColumn(label: string, group: MonthlyData["finished_products"], colId: string) {
    const ipCount   = group.in_production.length;
    const doneCount = group.completed.length;
    return `
      <div class="col-${colId}">
        <div class="column-header">${label}</div>
        <div class="summary-row">
          <div class="summary-chip"><strong>${ipCount}</strong>In Production</div>
          <div class="summary-chip"><strong>${doneCount}</strong>Assembly Completed</div>
        </div>
        <div class="tab-bar">
          <button class="tab-btn active-ip" data-col="${colId}" data-tab="ip">
            In Production (${ipCount})
          </button>
          <button class="tab-btn" data-col="${colId}" data-tab="done">
            Assembly Completed (${doneCount})
          </button>
        </div>
        <div class="tab-panel visible" id="${colId}-ip">${renderCards(group.in_production)}</div>
        <div class="tab-panel" id="${colId}-done">${renderCards(group.completed)}</div>
      </div>
    `;
  }

  function setupToggles() {
    document.querySelectorAll<HTMLButtonElement>(".production-dashboard-root .tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const col = btn.dataset.col!;
        const tab = btn.dataset.tab!;
        document.querySelectorAll<HTMLButtonElement>(`.production-dashboard-root .tab-btn[data-col="${col}"]`).forEach((b) => {
          b.classList.remove("active-ip", "active-done");
        });
        btn.classList.add(tab === "ip" ? "active-ip" : "active-done");
        document.getElementById(`${col}-ip`)!.classList.toggle("visible", tab === "ip");
        document.getElementById(`${col}-done`)!.classList.toggle("visible", tab === "done");
      });
    });
  }

  function renderDashboard(data: MonthlyData) {
    document.getElementById("last-synced")!.textContent = formatTimestamp(data.generated_at);
    const main = document.getElementById("main-content")!;
    main.innerHTML = `
      <div class="columns">
        ${renderColumn("Finished Products", data.finished_products, "fp")}
        ${renderColumn("Subassemblies",     data.subassemblies,     "sa")}
      </div>
    `;
    setupToggles();
  }

  function renderError(msg: string) {
    document.getElementById("main-content")!.innerHTML =
      `<div class="error-message">${esc(msg)}</div>`;
  }

  function updateNav() {
    const ym = availableMonths[currentIndex];
    if (!ym) return;
    const [year] = ym.split("-");

    const years = [...new Set(availableMonths.map((m) => m.split("-")[0]))];
    const monthsForYear = availableMonths.filter((m) => m.startsWith(year + "-"));

    const selYear  = document.getElementById("sel-year")  as HTMLSelectElement;
    const selMonth = document.getElementById("sel-month") as HTMLSelectElement;

    selYear.innerHTML = years.map((y) =>
      `<option value="${y}"${y === year ? " selected" : ""}>${y}</option>`,
    ).join("");

    selMonth.innerHTML = monthsForYear.map((m) => {
      const [, mm] = m.split("-");
      return `<option value="${m}"${m === ym ? " selected" : ""}>${MONTH_NAMES[parseInt(mm, 10) - 1]}</option>`;
    }).join("");

    (document.getElementById("btn-prev") as HTMLButtonElement).disabled = currentIndex >= availableMonths.length - 1;
    (document.getElementById("btn-next") as HTMLButtonElement).disabled = currentIndex <= 0;
  }

  async function loadMonth(ym: string) {
    document.getElementById("main-content")!.innerHTML =
      `<div class="loading-overlay">Loading data…</div>`;
    try {
      const resp = await fetch(`/data/${ym}.json?_=${Date.now()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      renderDashboard(data);
    } catch (e: any) {
      renderError(`Failed to load data for ${formatMonth(ym)}: ${e.message}`);
    }
  }

  async function loadAllMonths() {
    const results: Record<string, MonthlyData> = {};
    await Promise.all(availableMonths.map(async (ym) => {
      try {
        const r = await fetch(`/data/${ym}.json?_=${Date.now()}`);
        if (r.ok) results[ym] = await r.json();
      } catch { /* ignore */ }
    }));
    return results;
  }

  function computeAnalytics(allData: Record<string, MonthlyData>) {
    const months = [...availableMonths].reverse().filter((ym) => allData[ym]);
    const stats = months.map((ym) => {
      const d     = allData[ym];
      const fpDone = d.finished_products.completed;
      const saDone = d.subassemblies.completed;
      const allIP  = [...d.finished_products.in_production, ...d.subassemblies.in_production];
      return {
        month:    ym,
        label:    formatMonth(ym),
        fpCount:  fpDone.length,
        saCount:  saDone.length,
        fpQty:    fpDone.reduce((s, r) => s + (r.quantity || 0), 0),
        saQty:    saDone.reduce((s, r) => s + (r.quantity || 0), 0),
        ipCount:  allIP.length,
        allDone:  [...fpDone, ...saDone],
      };
    });

    const totalCount = stats.reduce((s, m) => s + m.fpCount + m.saCount, 0);
    const totalQty   = stats.reduce((s, m) => s + m.fpQty   + m.saQty,   0);
    const current    = stats[stats.length - 1] || ({} as any);

    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    let rolling90Count = 0;
    let rolling90Qty   = 0;
    stats.forEach((m) => m.allDone.forEach((r) => {
      if (r.date && new Date(r.date) >= cutoff90) {
        rolling90Count++;
        rolling90Qty += r.quantity || 0;
      }
    }));

    const itemMap: Record<string, number> = {};
    stats.forEach((m) => m.allDone.forEach((r) => {
      const k = r.item_name || "Unknown";
      itemMap[k] = (itemMap[k] || 0) + (r.quantity || 0);
    }));
    const topItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const staffMap: Record<string, number> = {};
    stats.forEach((m) => m.allDone.forEach((r) => {
      (r.production_staff || []).forEach((name) => { staffMap[name] = (staffMap[name] || 0) + 1; });
    }));
    const staffList = Object.entries(staffMap).sort((a, b) => b[1] - a[1]);

    return { stats, totalCount, totalQty, current, topItems, staffList, rolling90Count, rolling90Qty };
  }

  function niceMax(val: number) {
    if (val <= 0) return 5;
    const exp = Math.pow(10, Math.floor(Math.log10(val)));
    for (const m of [1, 2, 5, 10]) {
      if (m * exp >= val) return m * exp;
    }
    return Math.ceil(val / exp) * exp;
  }

  function computeTicks(yMax: number) {
    const rawStep = yMax / 4;
    const exp = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    let step = exp;
    for (const m of [1, 2, 5, 10]) {
      if (m * exp >= rawStep) { step = m * exp; break; }
    }
    const ticks: number[] = [];
    for (let v = 0; v <= yMax + step * 0.01; v += step) ticks.push(Math.round(v));
    return ticks;
  }

  function buildBarChart(stats: any[], maxVal: number) {
    if (!stats.length) return '<p class="empty-state">No data</p>';

    const yMax  = niceMax(maxVal);
    const ticks = computeTicks(yMax);

    const yLabels = ticks.map((v) => {
      const pct = (v / yMax * 100).toFixed(2);
      return `<span class="y-label" style="bottom:calc(${pct}% - 7px)">${v}</span>`;
    }).join("");

    const gridLines = ticks.map((v) => {
      const pct = (v / yMax * 100).toFixed(2);
      return `<div class="grid-line" style="bottom:${pct}%"></div>`;
    }).join("");

    const barCols = stats.map((m) => {
      const total    = m.fpCount + m.saCount;
      const totalPct = (total / yMax * 100).toFixed(2);
      return `<div class="bar-col">
        <div class="bar-stack" style="height:${totalPct}%">
          <div class="bar-fp-seg" style="flex:${Math.max(m.fpCount, 0)}"></div>
          <div class="bar-sa-seg" style="flex:${Math.max(m.saCount, 0)}"></div>
        </div>
        <div class="bar-tooltip">
          <div><span class="tt-dot" style="background:#5535c8"></span>Finished Products: <strong>${m.fpCount}</strong></div>
          <div><span class="tt-dot" style="background:#07845a"></span>Subassemblies: <strong>${m.saCount}</strong></div>
          <div class="tt-total">Total: ${total}</div>
        </div>
      </div>`;
    }).join("");

    const xLabels = stats.map((m) => {
      const [y, mo] = m.month.split("-");
      return `<div class="x-label">${MONTH_NAMES[parseInt(mo, 10) - 1].slice(0, 3)} '${y.slice(2)}</div>`;
    }).join("");

    return `<div class="chart-wrap">
      <div class="chart-y-axis">${yLabels}</div>
      <div class="chart-inner">
        <div class="chart-bars-zone">
          ${gridLines}
          <div class="chart-bars-row">${barCols}</div>
        </div>
        <div class="chart-x-row">${xLabels}</div>
      </div>
    </div>`;
  }

  function renderAnalytics(a: any) {
    const curDone  = (a.current.fpCount || 0) + (a.current.saCount || 0);
    const curIP    = a.current.ipCount || 0;
    const curLabel = a.current.label || "—";

    const last6     = a.stats.slice(-6);
    const maxLast6  = Math.max(...last6.map((m: any) => m.fpCount + m.saCount), 1);
    const last6Bars = buildBarChart(last6, maxLast6);

    const currentYear = String(new Date().getFullYear());
    const yearStats   = a.stats.filter((s: any) => s.month.startsWith(currentYear));
    const maxYear     = Math.max(...yearStats.map((m: any) => m.fpCount + m.saCount), 1);
    const yearBars    = buildBarChart(yearStats, maxYear);

    const maxItemQty = a.topItems.length ? a.topItems[0][1] : 1;
    const itemRows = a.topItems.map(([name, qty]: [string, number], i: number) => `
      <div class="rank-row">
        <span class="rank-circle${i < 3 ? " top" : ""}">${i + 1}</span>
        <span class="rank-name" title="${esc(name)}">${esc(name)}</span>
        <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${(qty / maxItemQty * 100).toFixed(1)}%"></div></div>
        <span class="rank-val">${qty}</span>
      </div>`).join("") || `<p class="empty-state">No completed assemblies yet</p>`;

    const maxStaff = a.staffList.length ? a.staffList[0][1] : 1;
    const staffRows = a.staffList.map(([name, count]: [string, number], i: number) => `
      <div class="rank-row">
        <span class="rank-circle${i < 3 ? " top" : ""}">${i + 1}</span>
        <span class="rank-name" title="${esc(name)}">${esc(name)}</span>
        <div class="rank-bar-track"><div class="rank-bar-fill green" style="width:${(count / maxStaff * 100).toFixed(1)}%"></div></div>
        <span class="rank-val">${count}</span>
      </div>`).join("") || `<p class="empty-state">No staff data available</p>`;

    document.getElementById("main-content")!.innerHTML = `
      <div class="a-section">
        <div class="a-eyebrow" style="margin-bottom:16px;">Overview</div>
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-value">${a.totalCount}</div>
            <div class="kpi-label">Total Completed</div>
            <div class="kpi-sub">${a.totalQty} units · ${a.stats.length} month${a.stats.length !== 1 ? "s" : ""}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${curDone}</div>
            <div class="kpi-label">Completed This Month</div>
            <div class="kpi-sub">${curLabel}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${curIP}</div>
            <div class="kpi-label">In Production Now</div>
            <div class="kpi-sub">As of last sync</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${a.rolling90Count}</div>
            <div class="kpi-label">Completed (Last 90 Days)</div>
            <div class="kpi-sub">${a.rolling90Qty} units produced</div>
          </div>
        </div>
      </div>
      <div class="charts-row" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
        <div class="a-section" style="margin-bottom:0;">
          <div class="a-eyebrow">Production Trend</div>
          <div class="a-title">
            Last 6 Months
            <span class="a-legend">
              <span style="color:var(--accent)">■</span> FP &nbsp;
              <span style="color:var(--green)">■</span> SA
            </span>
          </div>
          <div class="section-divider"></div>
          ${last6Bars}
        </div>
        <div class="a-section" style="margin-bottom:0;">
          <div class="a-eyebrow">Annual Overview</div>
          <div class="a-title">
            ${currentYear}
            <span class="a-legend">
              <span style="color:var(--accent)">■</span> FP &nbsp;
              <span style="color:var(--green)">■</span> SA
            </span>
          </div>
          <div class="section-divider"></div>
          ${yearBars}
        </div>
      </div>
      <div class="a-columns">
        <div class="a-section">
          <div class="a-eyebrow">Performance</div>
          <div class="a-title">Top Items by Units Completed</div>
          <div class="section-divider"></div>
          <div class="rank-list">${itemRows}</div>
        </div>
        <div class="a-section">
          <div class="a-eyebrow">Team</div>
          <div class="a-title">Production Staff Activity</div>
          <div class="section-divider"></div>
          <div class="rank-list">${staffRows}</div>
        </div>
      </div>
    `;
  }

  async function showAnalytics() {
    if (!analyticsCache) {
      document.getElementById("main-content")!.innerHTML =
        `<div class="loading-overlay">Loading analytics…</div>`;
      analyticsCache = computeAnalytics(await loadAllMonths());
    }
    renderAnalytics(analyticsCache);
  }

  function showView(view: "monthly" | "analytics") {
    currentView = view;
    document.getElementById("btn-view-monthly")!.classList.toggle("active",  view === "monthly");
    document.getElementById("btn-view-analytics")!.classList.toggle("active", view === "analytics");
    const monthNav = document.querySelector<HTMLElement>(".production-dashboard-root .month-nav");
    if (monthNav) monthNav.style.display = view === "monthly" ? "" : "none";
    if (view === "monthly") {
      loadMonth(availableMonths[currentIndex]);
    } else {
      showAnalytics();
    }
  }

  async function init() {
    try {
      const resp = await fetch(`/data/index.json?_=${Date.now()}`);
      if (resp.ok) {
        availableMonths = await resp.json();
      }
    } catch {
      availableMonths = [];
    }

    try {
      const resp = await fetch(`/data/latest.json?_=${Date.now()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const monthInData = data.month;
      const idx = availableMonths.indexOf(monthInData);
      currentIndex = idx >= 0 ? idx : 0;

      if (availableMonths.length === 0 && monthInData) {
        availableMonths = [monthInData];
      }

      updateNav();
      renderDashboard(data);
    } catch (e: any) {
      updateNav();
      if (availableMonths.length === 0) {
        document.getElementById("main-content")!.innerHTML =
          `<div class="error-message">No data available yet. Run the GitHub Action manually to generate the first data files.</div>`;
      } else {
        renderError(`Could not load dashboard data: ${e.message}`);
      }
    }
  }

  // ── Wire up controls ─────────────────────────────────────────────
  document.getElementById("btn-view-monthly")!.addEventListener("click", () => {
    if (currentView !== "monthly") showView("monthly");
  });

  document.getElementById("btn-view-analytics")!.addEventListener("click", () => {
    if (currentView !== "analytics") showView("analytics");
  });

  document.getElementById("btn-prev")!.addEventListener("click", () => {
    if (currentIndex < availableMonths.length - 1) {
      currentIndex++;
      updateNav();
      loadMonth(availableMonths[currentIndex]);
    }
  });

  document.getElementById("btn-next")!.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateNav();
      loadMonth(availableMonths[currentIndex]);
    }
  });

  document.getElementById("sel-year")!.addEventListener("change", (e) => {
    const yr = (e.target as HTMLSelectElement).value;
    const match = availableMonths.find((m) => m.startsWith(yr + "-"));
    if (match) {
      currentIndex = availableMonths.indexOf(match);
      updateNav();
      if (currentView === "monthly") loadMonth(availableMonths[currentIndex]);
    }
  });

  document.getElementById("sel-month")!.addEventListener("change", (e) => {
    const idx = availableMonths.indexOf((e.target as HTMLSelectElement).value);
    if (idx >= 0) {
      currentIndex = idx;
      updateNav();
      if (currentView === "monthly") loadMonth(availableMonths[currentIndex]);
    }
  });

  init();
}
