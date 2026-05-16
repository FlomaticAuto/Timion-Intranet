"""
Explore Zoho Inventory Sales Orders + Items stock levels.

Run: python scripts/test_inventory_salesorders.py

What this does:
  1. Fetches a few Sales Orders to see structure + CRM Deal reference field.
  2. Fetches one Sales Order in detail to see line items (item name + quantity).
  3. Fetches a few Items to see stock fields (available_stock, reorder_level).

Set env vars before running:
  $env:ZOHO_CLIENT_ID     = "..."
  $env:ZOHO_CLIENT_SECRET = "..."
  $env:ZOHO_REFRESH_TOKEN = "..."
  $env:ZOHO_ORG_ID        = "..."
"""

import json
import os
import requests

ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"
INV_BASE       = "https://www.zohoapis.com/inventory/v1"


def get_access_token():
    resp = requests.post(ZOHO_TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "client_id":     os.environ["ZOHO_CLIENT_ID"],
        "client_secret": os.environ["ZOHO_CLIENT_SECRET"],
        "refresh_token": os.environ["ZOHO_REFRESH_TOKEN"],
    })
    resp.raise_for_status()
    data = resp.json()
    if "access_token" not in data:
        raise RuntimeError(f"Token refresh failed: {data}")
    print("Access token obtained.")
    return data["access_token"]


def get(headers, org_id, path, params=None):
    p = {"organization_id": org_id, **(params or {})}
    resp = requests.get(f"{INV_BASE}{path}", headers=headers, params=p)
    print(f"  Status: {resp.status_code}")
    try:
        return resp.json()
    except Exception:
        print(f"  Raw: {resp.text[:300]}")
        return None


def main():
    token   = get_access_token()
    org_id  = os.environ["ZOHO_ORG_ID"]
    headers = {"Authorization": f"Zoho-oauthtoken {token}"}

    # 1. Fetch a few Sales Orders — look for crm_deal_id or reference_number
    print("\n--- Test 1: first 3 Sales Orders (summary) ---")
    body = get(headers, org_id, "/salesorders", {"per_page": 3})
    if body:
        orders = body.get("salesorders", [])
        print(f"  {len(orders)} orders returned")
        for so in orders:
            print(json.dumps(so, indent=2))
            print("---")

    if not orders:
        print("  No sales orders found — stopping.")
        return

    # 2. Fetch the first Sales Order in full detail — look at line_items
    so_id = orders[0].get("salesorder_id")
    print(f"\n--- Test 2: Sales Order detail for {so_id} ---")
    detail = get(headers, org_id, f"/salesorders/{so_id}")
    if detail:
        so = detail.get("salesorder", {})
        # Print top-level fields (excluding line_items for brevity)
        top = {k: v for k, v in so.items() if k != "line_items"}
        print("Top-level fields:")
        print(json.dumps(top, indent=2)[:3000])
        print("\nLine items:")
        print(json.dumps(so.get("line_items", []), indent=2)[:2000])

    # 3. Fetch a few Items to see stock fields
    print("\n--- Test 3: first 5 Items — stock fields ---")
    body = get(headers, org_id, "/items", {"per_page": 5})
    if body:
        items = body.get("items", [])
        for item in items:
            print(f"  {item.get('name'):50s}  stock_on_hand={item.get('stock_on_hand')}  "
                  f"available={item.get('available_stock')}  reorder={item.get('reorder_level')}")


if __name__ == "__main__":
    main()
