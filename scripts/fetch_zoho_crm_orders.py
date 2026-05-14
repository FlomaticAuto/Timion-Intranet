"""
Fetch Zoho CRM Deals (Orders Process module) and Equipment History
(Issued_Equipment module) to produce a single orders.json file.

Writes: public/data/crm/orders.json

Three dates per order:
  order_date   — from Issued_Equipment.Order_Date (when originally placed, can be years old)
  created_date — from Deal.Created_Time (when the Order Process entry was made in CRM)
  closing_date — from Deal.Closing_Date (when the order was completed)

Strategy:
  1. Fetch all Deals (Orders Process) — gives us stage, type, dates, etc.
  2. Fetch all Issued_Equipment records with Order_Date + Order_Process_Entry.
     Order_Process_Entry is a lookup field on Equipment History pointing back to
     its parent Deal, so we can join them in Python without any per-deal API calls.
  3. Build deal_id → [order_dates] map from the equipment records.
  4. Filter: only include deals whose Created_Time >= FROM_DATE AND that have at
     least one linked Equipment History record with an Order_Date.

Filter is applied to created_date (Deal.Created_Time) so that backlog orders with
old order_dates are included as long as their Deal entry was created from March 2026.

Run directly: python scripts/fetch_zoho_crm_orders.py
"""

import json
import os
import requests
from datetime import datetime, timezone

ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"
ZOHO_CRM_BASE  = "https://www.zohoapis.com/crm/v2"
DEALS_MODULE   = "Deals"
EQ_MODULE      = "Issued_Equipment"

FROM_DATE = "2026-03-01"

DEAL_FIELDS = "id,Deal_Name,Account_Name,Order_Type,Stage,Lead_Source,Closing_Date,Created_Time"
EQ_FIELDS   = "id,Order_Date,Order_Process_Entry"


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


def str_value(raw):
    if raw is None:
        return ""
    if isinstance(raw, dict):
        return raw.get("name") or raw.get("full_name") or ""
    return str(raw)


def fetch_all_records(module, fields, headers):
    """Page through an entire module and return every record."""
    records, page = [], 1
    while True:
        resp = requests.get(
            f"{ZOHO_CRM_BASE}/{module}",
            headers=headers,
            params={"fields": fields, "page": page, "per_page": 200},
        )
        if resp.status_code == 204:
            break
        if not resp.ok:
            print(f"  HTTP {resp.status_code} fetching {module} — {resp.text[:300]}")
            resp.raise_for_status()
        body = resp.json()
        batch = body.get("data", [])
        records.extend(batch)
        print(f"  Page {page}: {len(batch)} records")
        if not body.get("info", {}).get("more_records", False):
            break
        page += 1
    return records


def main():
    client_id     = os.environ["ZOHO_CRM_CLIENT_ID"]
    client_secret = os.environ["ZOHO_CRM_CLIENT_SECRET"]
    refresh_token = os.environ["ZOHO_CRM_REFRESH_TOKEN"]

    print("Refreshing Zoho CRM access token...")
    token   = get_access_token(client_id, client_secret, refresh_token)
    headers = {"Authorization": f"Zoho-oauthtoken {token}"}

    # ── Step 1: fetch all Deals ────────────────────────────────────────
    print(f"\nFetching all deals from {DEALS_MODULE}...")
    all_deals = fetch_all_records(DEALS_MODULE, DEAL_FIELDS, headers)
    print(f"  {len(all_deals)} total deals fetched")

    # ── Step 2: fetch all Equipment History records ────────────────────
    print(f"\nFetching all equipment history from {EQ_MODULE}...")
    all_eq = fetch_all_records(EQ_MODULE, EQ_FIELDS, headers)
    print(f"  {len(all_eq)} total equipment history records fetched")

    # ── Step 3: build deal_id → [order_dates] map ──────────────────────
    # Order_Process_Entry is a lookup field on Equipment History pointing to a Deal.
    # It is returned as {"id": "...", "name": "..."} or None.
    eq_by_deal: dict[str, list[str]] = {}
    for eq in all_eq:
        order_date = eq.get("Order_Date")
        if not order_date:
            continue
        entry_ref = eq.get("Order_Process_Entry")
        if not entry_ref:
            continue
        # Lookup fields come back as a dict with "id"
        if isinstance(entry_ref, dict):
            deal_id = entry_ref.get("id", "")
        else:
            deal_id = str(entry_ref)
        if not deal_id:
            continue
        eq_by_deal.setdefault(deal_id, []).append(str(order_date))

    print(f"  {len(eq_by_deal)} deals have at least one Equipment History record with Order_Date")

    # ── Debug: list all field API names for Issued_Equipment from settings API ──
    print("\nDEBUG — all field API names in Issued_Equipment module:")
    resp_fields = requests.get(
        f"{ZOHO_CRM_BASE}/settings/fields",
        headers=headers,
        params={"module": EQ_MODULE},
    )
    if resp_fields.ok:
        fields_data = resp_fields.json().get("fields", [])
        print(f"  {'API Name':<50} {'Display Label':<40} {'Type'}")
        print(f"  {'-'*50} {'-'*40} {'-'*20}")
        for f in sorted(fields_data, key=lambda x: x.get("api_name", "")):
            print(f"  {f.get('api_name',''):<50} {f.get('field_label',''):<40} {f.get('data_type','')}")
    else:
        print(f"  HTTP {resp_fields.status_code} — {resp_fields.text[:200]}")

    # ── Step 4: build output orders list ──────────────────────────────
    orders = []
    skipped_before_cutoff = 0
    skipped_no_eq         = 0

    for deal in all_deals:
        created_time_raw = deal.get("Created_Time", "") or ""
        created_date = str(created_time_raw)[:10] if created_time_raw else ""

        if not created_date or created_date < FROM_DATE:
            skipped_before_cutoff += 1
            continue

        deal_id   = deal["id"]
        eq_dates  = eq_by_deal.get(deal_id, [])

        if not eq_dates:
            skipped_no_eq += 1
            continue

        order_date = min(eq_dates)

        customer = deal.get("Account_Name")
        if isinstance(customer, dict):
            customer = customer.get("name", "") or ""

        orders.append({
            "id":              deal_id,
            "name":            str_value(deal.get("Deal_Name", "")),
            "customer":        str(customer or ""),
            "order_type":      str_value(deal.get("Order_Type", "")),
            "stage":           str_value(deal.get("Stage", "")),
            "referral_source": str_value(deal.get("Lead_Source", "")),
            "order_date":      order_date,
            "created_date":    created_date,
            "closing_date":    deal.get("Closing_Date") or None,
        })

    orders.sort(key=lambda x: x["created_date"], reverse=True)

    print(f"\nResults:")
    print(f"  {len(orders)} orders included")
    print(f"  {skipped_before_cutoff} skipped — Deal Created_Time before {FROM_DATE} or missing")
    print(f"  {skipped_no_eq} skipped — no linked Equipment History with Order_Date")

    os.makedirs("public/data/crm", exist_ok=True)
    out = {
        "synced_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "orders":    orders,
    }
    out_path = "public/data/crm/orders.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {out_path} ({len(orders)} orders)")


if __name__ == "__main__":
    main()
