"""
Fetch Zoho CRM Deals (Orders Process module) and their linked
Equipment History records to obtain the Order_Date for each deal.

Writes: public/data/crm/orders.json

Three dates per order:
  order_date   — from Issued_Equipment.Order_Date (when originally placed, can be years old)
  created_date — from Deal.Created_Time (when the Order Process entry was made in CRM)
  closing_date — from Deal.Closing_Date (when the order was completed)

Strategy:
  1. Fetch all Deals (Orders Process).
  2. Filter to deals where Created_Time >= FROM_DATE.
  3. For each qualifying deal, call the related records endpoint:
       GET /Deals/{id}/Equipment_History_Entries
     to get linked Equipment History records and their Order_Date.
  4. Use the earliest Order_Date across all linked records.
  5. Skip deals with no linked Equipment History records.

Run directly: python scripts/fetch_zoho_crm_orders.py
"""

import json
import os
import requests
from datetime import datetime, timezone

ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"
ZOHO_CRM_BASE  = "https://www.zohoapis.com/crm/v2"
DEALS_MODULE   = "Deals"
EQ_RELATION    = "Equipment_History_Entries"   # multi-lookup relation name on the Deal

FROM_DATE = "2026-03-01"

DEAL_FIELDS = "id,Deal_Name,Account_Name,Order_Type,Stage,Lead_Source,Closing_Date,Created_Time"


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


def fetch_all_deals(headers):
    records, page = [], 1
    while True:
        resp = requests.get(
            f"{ZOHO_CRM_BASE}/{DEALS_MODULE}",
            headers=headers,
            params={"fields": DEAL_FIELDS, "page": page, "per_page": 200},
        )
        if resp.status_code == 204:
            break
        if not resp.ok:
            print(f"  HTTP {resp.status_code} — {resp.text[:300]}")
            resp.raise_for_status()
        body = resp.json()
        records.extend(body.get("data", []))
        print(f"  Page {page}: {len(body.get('data', []))} deals")
        if not body.get("info", {}).get("more_records", False):
            break
        page += 1
    return records


def fetch_deal_equipment(deal_id, headers):
    """Fetch linked Equipment History records for a single deal via the
    Equipment_History_Entries relation. Returns list of Order_Date strings."""
    resp = requests.get(
        f"{ZOHO_CRM_BASE}/{DEALS_MODULE}/{deal_id}/{EQ_RELATION}",
        headers=headers,
        params={"fields": "Order_Date", "per_page": 20},
    )
    if resp.status_code == 204:
        return []
    if not resp.ok:
        print(f"  HTTP {resp.status_code} for deal {deal_id} — {resp.text[:200]}")
        return []
    return [
        str(rec["Order_Date"])
        for rec in resp.json().get("data", [])
        if rec.get("Order_Date")
    ]


def main():
    client_id     = os.environ["ZOHO_CRM_CLIENT_ID"]
    client_secret = os.environ["ZOHO_CRM_CLIENT_SECRET"]
    refresh_token = os.environ["ZOHO_CRM_REFRESH_TOKEN"]

    print("Refreshing Zoho CRM access token...")
    token   = get_access_token(client_id, client_secret, refresh_token)
    headers = {"Authorization": f"Zoho-oauthtoken {token}"}

    print(f"\nFetching all deals from {DEALS_MODULE}...")
    all_deals = fetch_all_deals(headers)
    print(f"  {len(all_deals)} total deals fetched")

    orders = []
    skipped_before_cutoff = 0
    skipped_no_eq         = 0

    for i, deal in enumerate(all_deals):
        created_time_raw = deal.get("Created_Time", "") or ""
        created_date = str(created_time_raw)[:10] if created_time_raw else ""

        if not created_date or created_date < FROM_DATE:
            skipped_before_cutoff += 1
            continue

        deal_id = deal["id"]
        print(f"  [{i+1}/{len(all_deals)}] {deal.get('Deal_Name','?')} — fetching equipment...")
        eq_dates = fetch_deal_equipment(deal_id, headers)

        if not eq_dates:
            skipped_no_eq += 1
            print(f"    No linked equipment — skipping")
            continue

        order_date = min(eq_dates)
        print(f"    Order_Date: {order_date} ({len(eq_dates)} equipment record(s))")

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
    print(f"  {skipped_before_cutoff} skipped — Created_Time before {FROM_DATE} or missing")
    print(f"  {skipped_no_eq} skipped — no linked Equipment History records")

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
