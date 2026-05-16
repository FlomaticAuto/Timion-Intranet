interface ReorderItem {
  name: string;
  available: number;
  stock_on_hand: number;
  reorder_level: number;
  status: "below_reorder" | "at_reorder" | "near_reorder" | "ok" | "no_reorder_set";
  item_type: "Finished Items" | "Subassemblies" | "Hardware & Materials";
}

interface ReorderData {
  synced_at: string;
  summary: {
    total_with_reorder: number;
    below_reorder: number;
    at_reorder: number;
    near_reorder: number;
    ok: number;
  };
  items: ReorderItem[];
}

type TypeFilter = "all" | "Finished Items" | "Subassemblies" | "Hardware & Materials";

const state: {
  data: ReorderData | null;
  typeFilter: TypeFilter;
  showAll: boolean;
  search: string;
} = { data: null, typeFilter: "all", showAll: false, search: "" };

export function initReorderDashboard(): void {
  fetch("/data/inventory/reorder.json")
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<ReorderData>;
    })
    .then(data => {
      state.data = data;
      renderSynced(data.synced_at);
      renderContent();
      setupEvents();
    })
    .catch(err => {
      const el = document.getElementById("rl-content");
      if (el) el.innerHTML = `<div class="rl-error">Failed to load data: ${err.message}<br><small>Run a sync to generate the data file.</small></div>`;
      const syncEl = document.getElementById("rl-synced");
      if (syncEl) syncEl.textContent = "No data";
    });
}

function renderSynced(synced_at: string): void {
  const el = document.getElementById("rl-synced");
  if (!el) return;
  try {
    const d = new Date(synced_at);
    el.textContent = `Synced ${d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} at ${d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    el.textContent = `Synced ${synced_at}`;
  }
}

function renderContent(): void {
  const el = document.getElementById("rl-content");
  if (!el || !state.data) return;
  el.innerHTML = kpisHTML(state.data.summary) + '<div id="rl-view" class="rl-animate"></div>';
  renderView();
}

function renderView(): void {
  const el = document.getElementById("rl-view");
  if (!el || !state.data) return;
  el.className = "rl-animate";
  el.innerHTML = tableHTML(getFilteredItems());
}

function setupEvents(): void {
  const content = document.getElementById("rl-content");
  if (!content) return;

  content.addEventListener("click", e => {
    const target = e.target as HTMLElement;

    const typeTab = target.closest<HTMLElement>("[data-type]");
    if (typeTab) {
      state.typeFilter = typeTab.dataset.type as TypeFilter;
      renderView();
      return;
    }

    const showAllBtn = target.closest<HTMLElement>("[data-showall]");
    if (showAllBtn) {
      state.showAll = !state.showAll;
      renderView();
      return;
    }
  });

  content.addEventListener("input", e => {
    const target = e.target as HTMLElement;
    if (target.id === "rl-search") {
      state.search = (target as HTMLInputElement).value.toLowerCase();
      renderView();
    }
  });
}

// ── Filtering ────────────────────────────────────────────────────────────────

function getFilteredItems(): ReorderItem[] {
  if (!state.data) return [];

  return state.data.items.filter(item => {
    // Exclude items with no reorder level
    if (item.status === "no_reorder_set") return false;
    // Status filter: default hides "ok" items
    if (!state.showAll && item.status === "ok") return false;
    // Type filter
    if (state.typeFilter !== "all" && item.item_type !== state.typeFilter) return false;
    // Search
    if (state.search && !item.name.toLowerCase().includes(state.search)) return false;
    return true;
  });
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

function kpisHTML(s: ReorderData["summary"]): string {
  const needsOrdering = s.below_reorder + s.at_reorder;
  return `<div class="kpi-row">
    ${kpi("c-total", s.total_with_reorder, "Tracked Items",   "reorder level set")}
    ${kpi("c-below", s.below_reorder,       "Below Reorder",  "order immediately")}
    ${kpi("c-at",    s.at_reorder,           "At Reorder",     "order now")}
    ${kpi("c-near",  s.near_reorder,         "Approaching",    "order soon")}
  </div>
  <div style="display:none">${needsOrdering}</div>`;
}

function kpi(cls: string, num: number, label: string, sub: string): string {
  return `<div class="kpi-card ${cls}">
    <div class="kpi-num">${num}</div>
    <div class="kpi-label">${label}</div>
    <div class="kpi-sub">${sub}</div>
  </div>`;
}

// ── Table ─────────────────────────────────────────────────────────────────────

function tableHTML(items: ReorderItem[]): string {
  const showAllActive = state.showAll ? "active" : "";

  const toolbar = `<div class="rl-toolbar">
    <input class="rl-search" id="rl-search" type="text" placeholder="Search items…" value="${esc(state.search)}" />
    <div class="type-tabs">
      ${typeTab("all",                 "All")}
      ${typeTab("Finished Items",      "Finished")}
      ${typeTab("Subassemblies",       "Subassemblies")}
      ${typeTab("Hardware & Materials","Hardware")}
    </div>
    <button class="show-all-btn ${showAllActive}" data-showall="1">
      ${state.showAll ? "Hide OK items" : "Show all"}
    </button>
    <span class="table-count">${items.length} item${items.length !== 1 ? "s" : ""}</span>
  </div>`;

  if (items.length === 0) {
    return toolbar + `<div class="rl-empty">No items match the current filter.</div>`;
  }

  const rows = items.map(item => {
    const availClass =
      item.status === "below_reorder" ? "td-avail-below" :
      item.status === "at_reorder"    ? "td-avail-at"    :
      item.status === "near_reorder"  ? "td-avail-near"  :
      "td-avail-ok";

    const gap = item.available - item.reorder_level;
    const gapStr = gap >= 0 ? `+${fmtQty(gap)}` : fmtQty(gap);

    return `<tr>
      <td class="td-item">${esc(item.name)}</td>
      <td>${typeBadgeHTML(item.item_type)}</td>
      <td class="${availClass}">${fmtQty(item.available)}</td>
      <td class="td-num">${fmtQty(item.reorder_level)}</td>
      <td class="${availClass}" style="text-align:right">${gapStr}</td>
      <td>${statusBadgeHTML(item)}</td>
    </tr>`;
  }).join("");

  return toolbar + `<div class="rl-table-wrap">
    <table class="rl-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Type</th>
          <th style="text-align:right">Available</th>
          <th style="text-align:right">Reorder Level</th>
          <th style="text-align:right">Gap</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function typeTab(value: string, label: string): string {
  const active = state.typeFilter === value ? "active" : "";
  return `<button class="type-tab ${active}" data-type="${value}">${label}</button>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeBadgeHTML(type: string): string {
  const cls =
    type === "Finished Items"      ? "tb-finished" :
    type === "Subassemblies"       ? "tb-sub"       :
    "tb-hardware";
  return `<span class="type-badge ${cls}">${esc(type)}</span>`;
}

function statusBadgeHTML(item: ReorderItem): string {
  if (item.status === "below_reorder") {
    return `<span class="status-badge sb-below">Short by ${fmtQty(item.reorder_level - item.available)}</span>`;
  }
  if (item.status === "at_reorder") {
    return `<span class="status-badge sb-at">Order Now</span>`;
  }
  if (item.status === "near_reorder") {
    return `<span class="status-badge sb-near">Approaching</span>`;
  }
  return `<span class="status-badge sb-ok">OK</span>`;
}

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
