"""
Fetch Zoho Inventory Purchase Orders for the current year.

Writes: public/data/purchaseorders.json

Uses the same Inventory OAuth credentials as fetch_zoho.py:
  ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID

Run directly: python scripts/fetch_zoho_purchaseorders.py
"""

import json
import os
import requests
from datetime import datetime, timezone

ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"
INV_BASE       = "https://www.zohoapis.com/inventory/v1"
OUTPUT_FILE    = "public/data/purchaseorders.json"
YEAR           = datetime.now().year


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


def fetch_all_pages(url, headers, params, data_key):
    results = []
    page = 1
    while True:
        p = {**params, "page": page, "per_page": 200}
        resp = requests.get(url, headers=headers, params=p)
        if not resp.ok:
            print(f"  HTTP {resp.status_code} — {resp.text[:300]}")
            resp.raise_for_status()
        body = resp.json()
        if body.get("code", 0) != 0:
            raise RuntimeError(f"Zoho API error: {body.get('message')} (code {body.get('code')})")
        records = body.get(data_key, [])
        results.extend(records)
        if not body.get("page_context", {}).get("has_more_page", False):
            break
        page += 1
        print(f"    page {page - 1}: {len(records)} records")
    return results


def main():
    client_id     = os.environ["ZOHO_CLIENT_ID"]
    client_secret = os.environ["ZOHO_CLIENT_SECRET"]
    refresh_token = os.environ["ZOHO_REFRESH_TOKEN"]
    org_id        = os.environ["ZOHO_ORG_ID"]

    token   = get_access_token(client_id, client_secret, refresh_token)
    headers = {"Authorization": f"Zoho-oauthtoken {token}"}

    params = {
        "organization_id": org_id,
        "date_start":      f"{YEAR}-01-01",
        "date_end":        f"{YEAR}-12-31",
    }

    print(f"Fetching Inventory purchase orders for {YEAR}...")
    raw = fetch_all_pages(f"{INV_BASE}/purchaseorders", headers, params, "purchaseorders")
    print(f"  {len(raw)} orders fetched")

    orders = []
    for po in raw:
        orders.append({
            "id":              po.get("purchaseorder_id", ""),
            "number":          po.get("purchaseorder_number", ""),
            "reference":       po.get("reference_number", "") or "",
            "date":            po.get("date", ""),
            "delivery_date":   po.get("delivery_date", "") or po.get("expected_delivery_date", "") or "",
            "vendor":          po.get("vendor_name", ""),
            "status":          po.get("status", ""),
            "approval_status": po.get("approval_status", "") or "",
            "total":           float(po.get("total", 0) or 0),
            "balance":         float(po.get("balance", 0) or 0),
            "currency":        po.get("currency_code", "ZAR"),
        })

    output = {
        "synced_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "year":      YEAR,
        "orders":    orders,
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Written {len(orders)} orders → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
