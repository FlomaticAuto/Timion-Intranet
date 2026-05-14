/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Visit Report Dashboard — imperative DOM logic.
 *
 * Mirrors the pattern of the Production Dashboard (dashboard.ts):
 * called by VisitDashboardClient inside a useEffect, after the JSX
 * skeleton (with all required element IDs) is in the DOM.
 *
 * Data lives at /data/crm/*.json — written by scripts/fetch_zoho_crm.py.
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface VisitRecord {
  id:         string;
  date:       string;
  therapist:  string;
  visit_type: string;
  location:   string;
}

interface MonthlyData {
  generated_at: string;
  month:        string;
  total:        number;
  visits:       VisitRecord[];
}

export function initVisitDashboard() {
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
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const VISIT_BASE = "https://one.zoho.com/zohoone/timionnpc/home/cxapp/crm/org878871386/tab/CustomModule4";

  // ── Monthly view ───────────────────────────────────────────────────
  function renderCards(visits: VisitRecord[]) {
    if (!visits || visits.length === 0) {
      return `<p class="empty-state">No visits recorded for this period</p>`;
    }
    return visits.map((v, idx) => `
      <div class="card" style="animation-delay:${(idx * 0.03).toFixed(2)}s">
        <div class="card-title">${esc(v.visit_type || "Visit")}</div>
        <div class="card-meta">
          <span data-label="Date">${esc(formatDate(v.date))}</span>
          <span data-label="Therapist">${esc(v.therapist || "—")}</span>
          <span data-label="Location">${esc(v.location || "—")}</span>
        </div>
        ${v.id ? `<div class="card-footer"><a class="zoho-link" href="${VISIT_BASE}/${esc(v.id)}" target="_blank" rel="noopener noreferrer" title="Open in Zoho CRM">↗</a></div>` : ""}
      </div>
    `).join("");
  }

  function renderDashboard(data: MonthlyData) {
    document.getElementById("last-synced")!.textContent = formatTimestamp(data.generated_at);

    const visits           = data.visits || [];
    const uniqueTherapists = new Set(visits.map((v) => v.therapist).filter(Boolean)).size;
    const uniqueTypes      = new Set(visits.map((v) => v.visit_type).filter(Boolean)).size;
    const uniqueLocations  = new Set(visits.map((v) => v.location).filter(Boolean)).size;

    document.getElementById("main-content")!.innerHTML = `
      <div class="summary-row">
        <div class="summary-chip v-total">
          <strong>${visits.length}</strong>Total Visits
        </div>
        <div class="summary-chip v-therapists">
          <strong>${uniqueTherapists}</strong>Therapists Active
        </div>
        <div class="summary-chip v-types">
          <strong>${uniqueTypes}</strong>Visit Types
        </div>
        <div class="summary-chip v-locations">
          <strong>${uniqueLocations}</strong>Locations
        </div>
      </div>
      <div class="card-grid">${renderCards(visits)}</div>
    `;
  }

  function renderError(msg: string) {
    document.getElementById("main-content")!.innerHTML =
      `<div class="error-message">${esc(msg)}</div>`;
  }

  // ── Navigation ─────────────────────────────────────────────────────
  function updateNav() {
    const ym = availableMonths[currentIndex];
    if (!ym) return;
    const [year] = ym.split("-");
    const years          = [...new Set(availableMonths.map((m) => m.split("-")[0]))];
    const monthsForYear  = availableMonths.filter((m) => m.startsWith(year + "-"));

    const selYear  = document.getElementById("sel-year")  as HTMLSelectElement;
    const selMonth = document.getElementById("sel-month") as HTMLSelectElement;

    selYear.innerHTML = years.map((y) =>
      `<option value="${y}"${y === year ? " selected" : ""}>${y}</option>`,
    ).join("");

    selMonth.innerHTML = monthsForYear.map((m) => {
      const [, mm] = m.split("-");
      return `<option value="${m}"${m === ym ? " selected" : ""}>${MONTH_NAMES[parseInt(mm, 10) - 1]}</option>`;
    }).join("");

    (document.getElementById("btn-prev") as HTMLButtonElement).disabled =
      currentIndex >= availableMonths.length - 1;
    (document.getElementById("btn-next") as HTMLButtonElement).disabled =
      currentIndex <= 0;
  }

  async function loadMonth(ym: string) {
    document.getElementById("main-content")!.innerHTML =
      `<div class="loading-overlay">Loading data…</div>`;
    try {
      const resp = await fetch(`/data/crm/${ym}.json?_=${Date.now()}`);
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
          const r = await fetch(`/data/crm/${ym}.json?_=${Date.now()}`);
          if (r.ok) results[ym] = await r.json();
        } catch { /* ignore */ }
      }),
    );
    return results;
  }

  function computeAnalytics(allData: Record<string, MonthlyData>) {
    const months = [...availableMonths].reverse().filter((ym) => allData[ym]);
    const stats = months.map((ym) => {
      const visits = allData[ym].visits || [];
      return { month: ym, label: formatMonth(ym), count: visits.length, visits };
    });

    const allVisits  = stats.flatMap((m) => m.visits);
    const totalCount = allVisits.length;
    const current    = stats[stats.length - 1] || ({} as any);

    const activeThisMonth = current.visits
      ? new Set(current.visits.map((v: VisitRecord) => v.therapist).filter(Boolean)).size
      : 0;

    const cutoff90   = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const rolling90  = allVisits.filter((v) => v.date && new Date(v.date) >= cutoff90).length;

    const therapistMap: Record<string, number> = {};
    allVisits.forEach((v) => {
      if (v.therapist) therapistMap[v.therapist] = (therapistMap[v.therapist] || 0) + 1;
    });
    const therapistList = Object.entries(therapistMap).sort((a, b) => b[1] - a[1]);

    const typeMap: Record<string, number> = {};
    allVisits.forEach((v) => {
      if (v.visit_type) typeMap[v.visit_type] = (typeMap[v.visit_type] || 0) + 1;
    });
    const typeList = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

    const locationMap: Record<string, number> = {};
    allVisits.forEach((v) => {
      if (v.location) locationMap[v.location] = (locationMap[v.location] || 0) + 1;
    });
    const locationList = Object.entries(locationMap).sort((a, b) => b[1] - a[1]);

    return { stats, totalCount, current, activeThisMonth, rolling90, therapistList, typeList, locationList };
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

  function buildBarChart(stats: any[]) {
    if (!stats.length) return `<p class="empty-state">No data</p>`;

    const maxVal = Math.max(...stats.map((m) => m.count), 1);
    const yMax   = niceMax(maxVal);
    const ticks  = computeTicks(yMax);

    const yLabels = ticks.map((v) => {
      const pct = (v / yMax * 100).toFixed(2);
      return `<span class="y-label" style="bottom:calc(${pct}% - 7px)">${v}</span>`;
    }).join("");

    const gridLines = ticks.map((v) => {
      const pct = (v / yMax * 100).toFixed(2);
      return `<div class="grid-line" style="bottom:${pct}%"></div>`;
    }).join("");

    const barCols = stats.map((m) => {
      const pct = (m.count / yMax * 100).toFixed(2);
      return `<div class="bar-col">
        <div class="bar-stack" style="height:${pct}%">
          <div class="bar-visit-seg"></div>
        </div>
        <div class="bar-tooltip">
          <div>Visits: <strong>${m.count}</strong></div>
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
      </div>
    `).join("");
  }

  function renderAnalytics(a: any) {
    const last6     = a.stats.slice(-6);
    const last6Bars = buildBarChart(last6);

    const currentYear = String(new Date().getFullYear());
    const yearStats   = a.stats.filter((s: any) => s.month.startsWith(currentYear));
    const yearBars    = buildBarChart(yearStats);

    document.getElementById("main-content")!.innerHTML = `
      <div class="a-section">
        <div class="a-eyebrow" style="margin-bottom:16px;">Overview</div>
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-value">${a.totalCount}</div>
            <div class="kpi-label">Total Visits</div>
            <div class="kpi-sub">${a.stats.length} month${a.stats.length !== 1 ? "s" : ""} of data</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${a.current.count || 0}</div>
            <div class="kpi-label">Visits This Month</div>
            <div class="kpi-sub">${a.current.label || "—"}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${a.activeThisMonth}</div>
            <div class="kpi-label">Active Therapists</div>
            <div class="kpi-sub">This month</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${a.rolling90}</div>
            <div class="kpi-label">Last 90 Days</div>
            <div class="kpi-sub">Visits conducted</div>
          </div>
        </div>
      </div>
      <div class="charts-row" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
        <div class="a-section" style="margin-bottom:0;">
          <div class="a-eyebrow">Visit Trend</div>
          <div class="a-title">Last 6 Months</div>
          <div class="section-divider"></div>
          ${last6Bars}
        </div>
        <div class="a-section" style="margin-bottom:0;">
          <div class="a-eyebrow">Annual Overview</div>
          <div class="a-title">${currentYear}</div>
          <div class="section-divider"></div>
          ${yearBars}
        </div>
      </div>
      <div class="a-columns" style="grid-template-columns:1fr 1fr 1fr;">
        <div class="a-section">
          <div class="a-eyebrow">Team</div>
          <div class="a-title">By Therapist</div>
          <div class="section-divider"></div>
          <div class="rank-list">${buildRankList(a.therapistList)}</div>
        </div>
        <div class="a-section">
          <div class="a-eyebrow">Breakdown</div>
          <div class="a-title">By Visit Type</div>
          <div class="section-divider"></div>
          <div class="rank-list">${buildRankList(a.typeList, "green")}</div>
        </div>
        <div class="a-section">
          <div class="a-eyebrow">Geography</div>
          <div class="a-title">By Location</div>
          <div class="section-divider"></div>
          <div class="rank-list">${buildRankList(a.locationList, "amber")}</div>
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
    document.getElementById("btn-view-monthly")!.classList.toggle("active",   view === "monthly");
    document.getElementById("btn-view-analytics")!.classList.toggle("active", view === "analytics");
    const monthNav = document.querySelector<HTMLElement>(".visit-dashboard-root .month-nav");
    if (monthNav) monthNav.style.display = view === "monthly" ? "" : "none";
    if (view === "monthly") {
      loadMonth(availableMonths[currentIndex]);
    } else {
      showAnalytics();
    }
  }

  // ── Bootstrap ──────────────────────────────────────────────────────
  async function init() {
    try {
      const resp = await fetch(`/data/crm/index.json?_=${Date.now()}`);
      if (resp.ok) availableMonths = await resp.json();
    } catch {
      availableMonths = [];
    }

    try {
      const resp = await fetch(`/data/crm/latest.json?_=${Date.now()}`);
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
        document.getElementById("main-content")!.innerHTML =
          `<div class="error-message">No data available yet — run the GitHub Action manually (or trigger it via workflow_dispatch) to pull the first month of visit data.</div>`;
      } else {
        renderError(`Could not load dashboard data: ${e.message}`);
      }
    }
  }

  // ── Wire up controls ───────────────────────────────────────────────
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
    const yr    = (e.target as HTMLSelectElement).value;
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
