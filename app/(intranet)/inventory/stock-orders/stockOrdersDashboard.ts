const CRM_DEAL_BASE = "https://crm.zoho.com/crm/org878871386/tab/Potentials";

interface OrderRef {
  so_number: string;
  so_id: string;
  crm_deal_id: string;
  crm_deal_name: string;
  customer: string;
  quantity: number;
}

interface StockItem {
  name: string;
  available: number;
  stock_on_hand: number;
  reorder_level: number;
  needed: number;
  remaining_after: number;
  status: "insufficient" | "at_risk" | "ok";
  shortfall?: number;
  orders: OrderRef[];
}

interface SOOrder {
  so_number: string;
  so_id: string;
  crm_deal_id: string;
  crm_deal_name: string;
  customer: string;
  date: string;
  items: { name: string; donation_name: string; quantity: number }[];
}

interface StockOrdersData {
  synced_at: string;
  summary: {
    total_orders: number;
    items_insufficient: number;
    items_at_risk: number;
    items_ok: number;
  };
  items: StockItem[];
  orders: SOOrder[];
}

const state: {
  data: StockOrdersData | null;
  view: "items" | "orders";
  filter: "all" | "insufficient" | "at_risk";
  expanded: Set<string>;
} = { data: null, view: "items", filter: "all", expanded: new Set() };

export function initStockOrdersDashboard(): void {
  fetch("/data/inventory/stock_orders.json")
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<StockOrdersData>;
    })
    .then(data => {
      state.data = data;
      renderSynced(data.synced_at);
      renderContent();
      setupViewToggle();
      setupEventDelegation();
    })
    .catch(err => {
      const el = document.getElementById("so-content");
      if (el) el.innerHTML = `<div class="so-error">Failed to load data: ${err.message}<br><small>Run a sync to generate the data file.</small></div>`;
      const syncEl = document.getElementById("so-synced");
      if (syncEl) syncEl.textContent = "No data";
    });
}

function renderSynced(synced_at: string): void {
  const el = document.getElementById("so-synced");
  if (!el) return;
  try {
    const d = new Date(synced_at);
    el.textContent = `Last synced: ${d.toLocaleString("en-ZA", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg",
    })} SAST`;
  } catch {
    el.textContent = `Last synced: ${synced_at}`;
  }
}

function setupViewToggle(): void {
  document.getElementById("btn-items")?.addEventListener("click", () => {
    state.view = "items";
    document.getElementById("btn-items")?.classList.add("active");
    document.getElementById("btn-orders")?.classList.remove("active");
    renderView();
  });
  document.getElementById("btn-orders")?.addEventListener("click", () => {
    state.view = "orders";
    document.getElementById("btn-orders")?.classList.add("active");
    document.getElementById("btn-items")?.classList.remove("active");
    renderView();
  });
}

function setupEventDelegation(): void {
  document.getElementById("so-content")?.addEventListener("click", e => {
    const target = e.target as HTMLElement;

    // Filter buttons
    const filterBtn = target.closest<HTMLElement>("[data-filter]");
    if (filterBtn) {
      state.filter = filterBtn.dataset.filter as typeof state.filter;
      renderView();
      return;
    }

    // Expand/collapse buttons
    const expandBtn = target.closest<HTMLElement>("[data-expand]");
    if (expandBtn) {
      const name = expandBtn.dataset.expand!;
      if (state.expanded.has(name)) {
        state.expanded.delete(name);
      } else {
        state.expanded.add(name);
      }
      renderView();
      return;
    }
  });
}

function renderContent(): void {
  const el = document.getElementById("so-content");
  if (!el || !state.data) return;
  el.innerHTML = kpisHTML(state.data.summary) + '<div id="so-view" class="so-animate"></div>';
  renderView();
}

function renderView(): void {
  const el = document.getElementById("so-view");
  if (!el || !state.data) return;
  el.className = "so-animate";
  if (state.view === "items") {
    el.innerHTML = itemsViewHTML(state.data.items, state.data.summary);
  } else {
    el.innerHTML = ordersViewHTML(state.data.orders, state.data.items);
  }
}

// ── KPI chips ────────────────────────────────────────────────────────────────

function kpisHTML(s: StockOrdersData["summary"]): string {
  return `<div class="kpi-row">
    ${kpi("c-orders",       s.total_orders,        "In Production",  "active orders")}
    ${kpi("c-insufficient", s.items_insufficient,  "Insufficient",   "stock short")}
    ${kpi("c-at-risk",      s.items_at_risk,        "At Risk",        "below reorder after fill")}
    ${kpi("c-ok",           s.items_ok,             "OK",             "fully covered")}
  </div>`;
}

function kpi(cls: string, num: number, label: string, sub: string): string {
  return `<div class="kpi-card ${cls}">
    <div class="kpi-num">${num}</div>
    <div class="kpi-label">${label}</div>
    <div class="kpi-sub">${sub}</div>
  </div>`;
}

// ── Items view ────────────────────────────────────────────────────────────────

function itemsViewHTML(items: StockItem[], summary: StockOrdersData["summary"]): string {
  if (items.length === 0) {
    return `<div class="so-empty">No items with active orders found.<br><small>Run a sync to refresh.</small></div>`;
  }

  const filtered = items.filter(item => {
    if (state.filter === "insufficient") return item.status === "insufficient";
    if (state.filter === "at_risk")      return item.status === "at_risk";
    return true;
  });

  const filterBar = `<div class="filter-bar">
    <button class="filter-btn fb-all  ${state.filter === "all"          ? "active" : ""}" data-filter="all">All (${items.length})</button>
    <button class="filter-btn fb-insuf ${state.filter === "insufficient" ? "active" : ""}" data-filter="insufficient">Insufficient (${summary.items_insufficient})</button>
    <button class="filter-btn fb-risk  ${state.filter === "at_risk"      ? "active" : ""}" data-filter="at_risk">At Risk (${summary.items_at_risk})</button>
    <span class="filter-count">${filtered.length} item${filtered.length !== 1 ? "s" : ""}</span>
  </div>`;

  if (filtered.length === 0) {
    return filterBar + `<div class="so-empty">No items match this filter.</div>`;
  }

  const rows = filtered.map(item => itemRowsHTML(item)).join("");

  return filterBar + `<div class="so-table-wrap">
    <table class="so-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:right">Needed</th>
          <th style="text-align:right">Available</th>
          <th style="text-align:right">After Fulfil.</th>
          <th style="text-align:right">Reorder</th>
          <th>Status</th>
          <th>Orders</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function itemRowsHTML(item: StockItem): string {
  const isExpanded = state.expanded.has(item.name);

  const afterClass =
    item.remaining_after < 0                                      ? "td-after-bad"  :
    item.remaining_after < item.reorder_level                     ? "td-after-risk" :
    "td-after-ok";

  const badge = statusBadgeHTML(item);

  const expandLabel = isExpanded
    ? `▾ Hide orders`
    : `▸ ${item.orders.length} order${item.orders.length !== 1 ? "s" : ""}`;

  const dataRow = `<tr class="data-row">
    <td class="td-item">${esc(item.name)}</td>
    <td class="td-num">${fmtQty(item.needed)}</td>
    <td class="td-num">${fmtQty(item.available)}</td>
    <td class="${afterClass}">${fmtQty(item.remaining_after)}</td>
    <td class="td-num">${item.reorder_level > 0 ? fmtQty(item.reorder_level) : "—"}</td>
    <td>${badge}</td>
    <td><button class="so-expand-btn" data-expand="${esc(item.name)}">${expandLabel}</button></td>
  </tr>`;

  if (!isExpanded) return dataRow;

  const subRows = item.orders.map(o => `<tr>
    <td>${esc(o.so_number)}</td>
    <td>${esc(o.crm_deal_name)}</td>
    <td>${esc(o.customer)}</td>
    <td class="td-num">${fmtQty(o.quantity)}</td>
    <td><a class="crm-link" href="${CRM_DEAL_BASE}/${o.crm_deal_id}" target="_blank" rel="noopener">↗</a></td>
  </tr>`).join("");

  const expandRow = `<tr class="expand-row">
    <td colspan="7">
      <div class="expand-inner">
        <div class="expand-label">Orders needing this item</div>
        <table class="expand-table">
          <thead><tr><th>SO #</th><th>Order</th><th>Customer</th><th style="text-align:right">Qty</th><th></th></tr></thead>
          <tbody>${subRows}</tbody>
        </table>
      </div>
    </td>
  </tr>`;

  return dataRow + expandRow;
}

// ── Orders view ───────────────────────────────────────────────────────────────

function ordersViewHTML(orders: SOOrder[], items: StockItem[]): string {
  if (orders.length === 0) {
    return `<div class="so-empty">No In Production orders found.</div>`;
  }

  const itemStatusIndex: Record<string, StockItem["status"]> = {};
  for (const item of items) itemStatusIndex[item.name] = item.status;

  const rows = orders.map(order => {
    const itemChips = order.items.map(i => {
      const s = itemStatusIndex[i.name] ?? "ok";
      const cls = s === "insufficient" ? "oi-insuf" : s === "at_risk" ? "oi-risk" : "oi-ok";
      return `<span class="oi-chip ${cls}">${esc(i.name)} × ${fmtQty(i.quantity)}</span>`;
    }).join("");

    return `<tr>
      <td style="font-weight:600;color:var(--text)">${esc(order.so_number)}</td>
      <td class="td-item">${esc(order.crm_deal_name)}</td>
      <td>${esc(order.customer)}</td>
      <td><div class="order-items-list">${itemChips}</div></td>
      <td style="color:var(--text-muted);white-space:nowrap">${fmtDate(order.date)}</td>
      <td><a class="crm-link" href="${CRM_DEAL_BASE}/${order.crm_deal_id}" target="_blank" rel="noopener">↗</a></td>
    </tr>`;
  }).join("");

  return `<div class="so-table-wrap">
    <table class="so-table">
      <thead>
        <tr>
          <th>SO #</th>
          <th>Order</th>
          <th>Customer</th>
          <th>Items</th>
          <th>Date</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeHTML(item: StockItem): string {
  if (item.status === "insufficient") {
    return `<span class="status-badge sb-insufficient">Short by ${fmtQty(item.shortfall ?? 0)}</span>`;
  }
  if (item.status === "at_risk") {
    const dropTo = item.remaining_after;
    return `<span class="status-badge sb-at-risk">At Risk — drops to ${fmtQty(dropTo)}</span>`;
  }
  return `<span class="status-badge sb-ok">OK</span>`;
}

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function fmtDate(s: string): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
