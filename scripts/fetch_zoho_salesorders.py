"""
Fetch Zoho Inventory Sales Orders for the current year.

Writes: public/data/salesorders.json

Uses the same Inventory OAuth credentials as fetch_zoho.py:
  ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID

Run directly: python scripts/fetch_zoho_salesorders.py
"""

import json
import os
import requests
from datetime import datetime, timezone

ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"
INV_BASE       = "https://www.zohoapis.com/inventory/v1"
OUTPUT_FILE    = "public/data/salesorders.json"
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


def _parse_crm_id(reference: str) -> str:
    """Extract numeric CRM deal ID from 'CRM Deal 123456' reference strings."""
    prefix = "CRM Deal "
    if reference.startswith(prefix):
        return reference[len(prefix):].strip()
    return ""


def _get_custom_field(record: dict, api_name: str) -> str:
    """Read a custom field by api_name — checks top-level key first, then custom_fields array."""
    val = record.get(api_name)
    if val:
        return str(val)
    for cf in record.get("custom_fields", []):
        if cf.get("api_name") == api_name:
            return str(cf.get("value", ""))
    return ""


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

    print(f"Fetching Inventory sales orders for {YEAR}...")
    raw = fetch_all_pages(f"{INV_BASE}/salesorders", headers, params, "salesorders")
    print(f"  {len(raw)} orders fetched")

    orders = []
    for so in raw:
        orders.append({
            "id":              so.get("salesorder_id", ""),
            "number":          so.get("salesorder_number", ""),
            "reference":       so.get("reference_number", "") or "",
            "date":            so.get("date", ""),
            "shipment_date":   so.get("shipment_date", "") or so.get("delivery_date", "") or "",
            "customer":        so.get("customer_name", ""),
            "status":          so.get("status", ""),
            "approval_status": so.get("approval_status", "") or "",
            "total":           float(so.get("total", 0) or 0),
            "balance":         float(so.get("balance", 0) or 0),
            "currency":        so.get("currency_code", "ZAR"),
            # Zoho stores the linked CRM deal in reference_number as "CRM Deal <id>"
            "crm_deal_id":     _parse_crm_id(so.get("reference_number", "") or ""),
            "order_type":      _get_custom_field(so, "cf_order_type"),
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
