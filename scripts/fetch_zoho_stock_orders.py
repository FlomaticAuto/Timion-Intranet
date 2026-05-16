"""
fetch_zoho_stock_orders.py

Compares In-Production CRM orders against Zoho Inventory stock levels.

Approach:
  1. COQL  — fetch CRM Deals where Stage = "In Production"
  2. Inventory — fetch all Sales Orders; filter by zcrm_potential_id
  3. For each matched SO — fetch line items (item name + quantity)
  4. Strip "(Donation) " prefix → finished item name
  5. Inventory Items — fetch all; index non-donation items by name → stock
  6. Compare demand vs stock; classify insufficient / at_risk / ok

Writes:
  public/data/inventory/stock_orders.json  (Stock vs Orders dashboard)
  public/data/inventory/reorder.json       (Reorder Level Report — all finished items)

Env vars: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID
"""

import json
import os
import time
import requests
from datetime import datetime, timezone

ZOHO_TOKEN_URL     = "https://accounts.zoho.com/oauth/v2/token"
COQL_URL           = "https://www.zohoapis.com/crm/v2.1/coql"
INV_BASE           = "https://www.zohoapis.com/inventory/v1"

IN_PRODUCTION_STAGE = "In Production"
DONATION_PREFIX     = "(Donation) "


def get_access_token(client_id, client_secret, refresh_token):
    resp = requests.post(ZOHO_TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "client_id":     client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
    })
    resp.raise_for_status()
    data = resp.json()
    if "access_token" not in data:
        raise RuntimeError(f"Token refresh failed: {data}")
    return data["access_token"]


def coql_fetch_all(headers, base_query):
    """Paginate a COQL query using LIMIT/OFFSET."""
    records, offset, limit = [], 0, 200
    while True:
        query = f"{base_query} LIMIT {limit} OFFSET {offset}"
        resp  = requests.post(COQL_URL, headers={**headers, "Content-Type": "application/json"},
                              json={"select_query": query})
        if resp.status_code == 204:
            break
        resp.raise_for_status()
        body = resp.json()
        data = body.get("data", [])
        records.extend(data)
        if not body.get("info", {}).get("more_records", False):
            break
        offset += limit
    return records


def inv_fetch_all(headers, org_id, path, data_key, params=None):
    """Paginate Zoho Inventory list endpoints."""
    records, page = [], 1
    while True:
        p = {"organization_id": org_id, "page": page, "per_page": 200, **(params or {})}
        resp = requests.get(f"{INV_BASE}{path}", headers=headers, params=p)
        if resp.status_code == 204:
            break
        if not resp.ok:
            print(f"  HTTP {resp.status_code} — {resp.text[:300]}")
            resp.raise_for_status()
        body = resp.json()
        if body.get("code", 0) != 0:
            raise RuntimeError(f"Zoho Inventory error: {body.get('message')} (code {body.get('code')})")
        records.extend(body.get(data_key, []))
        if not body.get("page_context", {}).get("has_more_page", False):
            break
        page += 1
    return records


def safe_float(val, default=0.0):
    if val is None or val == "":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def finished_name(donation_name):
    if str(donation_name).startswith(DONATION_PREFIX):
        return donation_name[len(DONATION_PREFIX):]
    return donation_name


def determine_status(needed, available, reorder_level):
    if available < needed:
        return "insufficient"
    if (available - needed) < reorder_level:
        return "at_risk"
    return "ok"


def main():
    client_id     = os.environ["ZOHO_CLIENT_ID"]
    client_secret = os.environ["ZOHO_CLIENT_SECRET"]
    refresh_token = os.environ["ZOHO_REFRESH_TOKEN"]
    org_id        = os.environ["ZOHO_ORG_ID"]

    print("Refreshing access token...")
    token   = get_access_token(client_id, client_secret, refresh_token)
    headers = {"Authorization": f"Zoho-oauthtoken {token}"}

    # ── 1. CRM Deals in "In Production" ──────────────────────────────────────
    print(f"\nFetching CRM Deals with Stage = '{IN_PRODUCTION_STAGE}'...")
    deals = coql_fetch_all(
        headers,
        f"SELECT id, Deal_Name FROM Deals WHERE Stage = '{IN_PRODUCTION_STAGE}'"
    )
    print(f"  {len(deals)} deal(s) in production")
    deal_map = {d["id"]: d.get("Deal_Name", "") for d in deals}
    deal_ids = set(deal_map.keys())

    # ── 2. Inventory Sales Orders ─────────────────────────────────────────────
    print("\nFetching all Inventory Sales Orders...")
    all_sos = inv_fetch_all(headers, org_id, "/salesorders", "salesorders")
    print(f"  {len(all_sos)} total")

    matched = [so for so in all_sos if so.get("zcrm_potential_id") in deal_ids]
    print(f"  {len(matched)} linked to In Production deals")

    # ── 3. Line items per matched SO ──────────────────────────────────────────
    print("\nFetching SO line items...")
    so_details = []
    for so in matched:
        so_id = so["salesorder_id"]
        resp  = requests.get(f"{INV_BASE}/salesorders/{so_id}",
                             headers=headers,
                             params={"organization_id": org_id})
        if not resp.ok:
            print(f"  Warning: SO {so_id} returned {resp.status_code}")
            continue
        body = resp.json()
        if body.get("code", 0) != 0:
            print(f"  Warning: SO {so_id} — {body.get('message')}")
            continue
        detail     = body.get("salesorder", {})
        line_items = detail.get("line_items", [])
        crm_id     = so.get("zcrm_potential_id", "")
        so_details.append({
            "so_id":         so_id,
            "so_number":     so.get("salesorder_number", ""),
            "crm_deal_id":   crm_id,
            "crm_deal_name": so.get("zcrm_potential_name") or deal_map.get(crm_id, ""),
            "customer":      so.get("customer_name", ""),
            "date":          so.get("date", ""),
            "line_items":    line_items,
        })
        print(f"  {so.get('salesorder_number')}: {len(line_items)} line item(s)")
        time.sleep(0.1)

    # ── 4. Inventory Items ─────────────────────────────────────────────────────
    print("\nFetching Inventory items...")
    all_items = inv_fetch_all(headers, org_id, "/items", "items")
    print(f"  {len(all_items)} total")

    finished_items = {}
    all_finished   = []
    for item in all_items:
        name = item.get("name", "")
        if name.startswith(DONATION_PREFIX):
            continue
        entry = {
            "name":          name,
            "available":     safe_float(item.get("available_stock")),
            "stock_on_hand": safe_float(item.get("stock_on_hand")),
            "reorder_level": safe_float(item.get("reorder_level")),
        }
        finished_items[name] = entry
        all_finished.append(entry)
    print(f"  {len(finished_items)} finished items (non-donation)")

    # ── 5. Aggregate demand per finished item ─────────────────────────────────
    demand_map  = {}
    orders_list = []

    for so in so_details:
        order_items = []
        for li in so["line_items"]:
            dname = li.get("name", "")
            if not dname.startswith(DONATION_PREFIX):
                continue  # skip service/cost lines — equipment items always have "(Donation) " prefix
            fname = finished_name(dname)
            qty   = safe_float(li.get("quantity"), 1.0)
            if fname not in demand_map:
                demand_map[fname] = {"needed": 0.0, "orders": []}
            demand_map[fname]["needed"] += qty
            demand_map[fname]["orders"].append({
                "so_number":     so["so_number"],
                "so_id":         so["so_id"],
                "crm_deal_id":   so["crm_deal_id"],
                "crm_deal_name": so["crm_deal_name"],
                "customer":      so["customer"],
                "quantity":      qty,
            })
            order_items.append({
                "name":          fname,
                "donation_name": dname,
                "quantity":      qty,
            })
        orders_list.append({
            "so_number":     so["so_number"],
            "so_id":         so["so_id"],
            "crm_deal_id":   so["crm_deal_id"],
            "crm_deal_name": so["crm_deal_name"],
            "customer":      so["customer"],
            "date":          so["date"],
            "items":         order_items,
        })

    # ── 6. Compare demand vs stock ────────────────────────────────────────────
    items_result = []
    counts       = {"insufficient": 0, "at_risk": 0, "ok": 0}

    for fname, demand in sorted(demand_map.items()):
        stock         = finished_items.get(fname, {"available": 0.0, "stock_on_hand": 0.0, "reorder_level": 0.0})
        needed        = demand["needed"]
        available     = stock["available"]
        reorder_level = stock["reorder_level"]
        status        = determine_status(needed, available, reorder_level)
        counts[status] += 1

        entry = {
            "name":            fname,
            "available":       available,
            "stock_on_hand":   stock["stock_on_hand"],
            "reorder_level":   reorder_level,
            "needed":          needed,
            "remaining_after": round(available - needed, 2),
            "status":          status,
            "orders":          demand["orders"],
        }
        if status == "insufficient":
            entry["shortfall"] = round(needed - available, 2)
        items_result.append(entry)

    status_order = {"insufficient": 0, "at_risk": 1, "ok": 2}
    items_result.sort(key=lambda x: (status_order[x["status"]], x["name"]))

    # ── 7. Reorder Level Report data ──────────────────────────────────────────
    reorder_items = []
    for entry in all_finished:
        avail  = entry["available"]
        rl     = entry["reorder_level"]
        if rl > 0 and avail < rl:
            rl_status = "below_reorder"
        elif rl > 0 and avail == rl:
            rl_status = "at_reorder"
        else:
            rl_status = "ok"
        reorder_items.append({
            "name":          entry["name"],
            "available":     avail,
            "stock_on_hand": entry["stock_on_hand"],
            "reorder_level": rl,
            "status":        rl_status,
        })
    rl_order = {"below_reorder": 0, "at_reorder": 1, "ok": 2}
    reorder_items.sort(key=lambda x: (rl_order[x["status"]], x["name"]))

    # ── 8. Write output ───────────────────────────────────────────────────────
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs("public/data/inventory", exist_ok=True)

    stock_orders_out = {
        "synced_at": now,
        "summary": {
            "total_orders":       len(so_details),
            "items_insufficient": counts["insufficient"],
            "items_at_risk":      counts["at_risk"],
            "items_ok":           counts["ok"],
        },
        "items":  items_result,
        "orders": orders_list,
    }
    with open("public/data/inventory/stock_orders.json", "w", encoding="utf-8") as f:
        json.dump(stock_orders_out, f, indent=2, ensure_ascii=False)
    print(f"\nWrote public/data/inventory/stock_orders.json")
    print(f"  {len(items_result)} items with demand — "
          f"insufficient={counts['insufficient']}  at_risk={counts['at_risk']}  ok={counts['ok']}")

    reorder_out = {"synced_at": now, "items": reorder_items}
    with open("public/data/inventory/reorder.json", "w", encoding="utf-8") as f:
        json.dump(reorder_out, f, indent=2, ensure_ascii=False)
    print(f"Wrote public/data/inventory/reorder.json ({len(reorder_items)} finished items)")


if __name__ == "__main__":
    main()
