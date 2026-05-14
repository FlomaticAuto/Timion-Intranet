"""
Fetch Zoho CRM Deals (Orders Process module) and their linked
Issued_Equipment records to obtain the Order_Date for each deal.

Writes a single file: public/data/crm/orders.json

Three dates per order:
  order_date   — from linked Issued_Equipment.Order_Date (when originally placed, can be years old)
  created_date — from Deal.Created_Time (when the Order Process entry was made in CRM)
  closing_date — from Deal.Closing_Date (when the order was completed)

Filter: only includes deals where Created_Time >= FROM_DATE. This captures the backlog
correctly — old orders (order_date 2023+) that are only now being processed still appear
because their Deal entry was created from March 2026 onwards.

Run directly: python scripts/fetch_zoho_crm_orders.py
"""

import json
import os
import sys
import requests
from datetime import datetime, timezone

ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"
ZOHO_CRM_BASE  = "https://www.zohoapis.com/crm/v2"
MODULE         = "Deals"
EQ_MODULE      = "Issued_Equipment"

FROM_DATE = "2026-03-01"

DEAL_FIELDS = "id,Deal_Name,Account_Name,Order_Type,Stage,Lead_Source,Closing_Date,Created_Time,Equipment_History"


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
            f"{ZOHO_CRM_BASE}/{MODULE}",
            headers=headers,
            params={"fields": DEAL_FIELDS, "page": page, "per_page": 200},
        )
        if resp.status_code == 204:
            break
        if not resp.ok:
            print(f"  HTTP {resp.status_code} fetching deals — {resp.text[:300]}")
            resp.raise_for_status()
        body = resp.json()
        records.extend(body.get("data", []))
        print(f"  Page {page}: {len(body.get('data', []))} deals")
        if not body.get("info", {}).get("more_records", False):
            break
        page += 1
    return records


def batch_fetch_equipment(eq_ids, headers):
    """Fetch Issued_Equipment records by IDs in batches of 100.
    Returns a dict mapping eq_id -> Order_Date string."""
    id_map = {}
    ids = list(eq_ids)
    for i in range(0, len(ids), 100):
        batch = ids[i:i + 100]
        resp = requests.get(
            f"{ZOHO_CRM_BASE}/{EQ_MODULE}",
            headers=headers,
            params={"ids": ",".join(batch), "fields": "id,Order_Date"},
        )
        if resp.status_code == 204:
            continue
        if not resp.ok:
            print(f"  HTTP {resp.status_code} fetching equipment batch — {resp.text[:200]}")
            continue
        for rec in resp.json().get("data", []):
            rec_id = rec.get("id", "")
            order_date = rec.get("Order_Date", "")
            if rec_id and order_date:
                id_map[rec_id] = str(order_date)
    return id_map


def main():
    client_id     = os.environ["ZOHO_CRM_CLIENT_ID"]
    client_secret = os.environ["ZOHO_CRM_CLIENT_SECRET"]
    refresh_token = os.environ["ZOHO_CRM_REFRESH_TOKEN"]

    print("Refreshing Zoho CRM access token...")
    token   = get_access_token(client_id, client_secret, refresh_token)
    headers = {"Authorization": f"Zoho-oauthtoken {token}"}

    print(f"Fetching all deals from {MODULE}...")
    all_deals = fetch_all_deals(headers)
    print(f"  {len(all_deals)} total deals fetched")

    # Collect all Equipment_History IDs referenced by deals
    eq_id_set = set()
    for deal in all_deals:
        eq_field = deal.get("Equipment_History")
        if not eq_field:
            continue
        # Multi-lookup returns a list of {id, name} objects
        if isinstance(eq_field, list):
            for item in eq_field:
                if isinstance(item, dict) and item.get("id"):
                    eq_id_set.add(str(item["id"]))
                elif isinstance(item, str) and item:
                    eq_id_set.add(item)

    print(f"  {len(eq_id_set)} unique Equipment History records to resolve")

    # Batch-fetch Order_Date for all referenced equipment records
    eq_date_map = {}
    if eq_id_set:
        eq_date_map = batch_fetch_equipment(eq_id_set, headers)
    print(f"  {len(eq_date_map)} equipment records resolved with Order_Date")

    # Build output orders list
    orders = []
    skipped_no_eq = 0
    skipped_no_date = 0
    skipped_before_cutoff = 0

    for deal in all_deals:
        eq_field = deal.get("Equipment_History")
        if not eq_field:
            skipped_no_eq += 1
            continue

        # Collect the IDs from this deal's Equipment_History field
        deal_eq_ids = []
        if isinstance(eq_field, list):
            for item in eq_field:
                if isinstance(item, dict) and item.get("id"):
                    deal_eq_ids.append(str(item["id"]))
                elif isinstance(item, str) and item:
                    deal_eq_ids.append(item)

        if not deal_eq_ids:
            skipped_no_eq += 1
            continue

        # Use the earliest Order_Date across all linked equipment records
        dates = [eq_date_map[eid] for eid in deal_eq_ids if eid in eq_date_map and eq_date_map[eid]]
        if not dates:
            skipped_no_date += 1
            continue

        order_date = min(dates)

        # created_date: extract date portion from Deal's Created_Time datetime
        created_time_raw = deal.get("Created_Time", "") or ""
        created_date = str(created_time_raw)[:10] if created_time_raw else ""

        # Filter on created_date — captures backlog orders whose original order_date
        # predates the cutoff but whose Order Process entry was made from March 2026 on.
        if not created_date or created_date < FROM_DATE:
            skipped_before_cutoff += 1
            continue

        customer = deal.get("Account_Name")
        if isinstance(customer, dict):
            customer = customer.get("name", "") or ""

        orders.append({
            "id":              deal.get("id", ""),
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
    print(f"  {skipped_no_eq} skipped — no linked Equipment History")
    print(f"  {skipped_no_date} skipped — Equipment History linked but no Order_Date resolved")
    print(f"  {skipped_before_cutoff} skipped — Deal Created_Time before {FROM_DATE} or missing")

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
