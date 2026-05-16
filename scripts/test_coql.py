"""
Quick COQL scope test + Equipment History field discovery.

Run: python scripts/test_coql.py

What this does:
  1. Gets a fresh access token (verifies new refresh token works).
  2. Hits the COQL endpoint with a minimal SELECT to confirm ZohoCRM.coql.READ is active.
  3. Fetches one row from Equipment_History to see real field names.
  4. Tries to fetch Equipment_History rows linked to a Deal to confirm the join works.

Set env vars before running:
  $env:ZOHO_CRM_CLIENT_ID     = "..."
  $env:ZOHO_CRM_CLIENT_SECRET = "..."
  $env:ZOHO_CRM_REFRESH_TOKEN = "..."
"""

import json
import os
import requests

ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"
COQL_URL       = "https://www.zohoapis.com/crm/v2.1/coql"


def get_access_token():
    resp = requests.post(ZOHO_TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "client_id":     os.environ["ZOHO_CRM_CLIENT_ID"],
        "client_secret": os.environ["ZOHO_CRM_CLIENT_SECRET"],
        "refresh_token": os.environ["ZOHO_CRM_REFRESH_TOKEN"],
    })
    resp.raise_for_status()
    data = resp.json()
    if "access_token" not in data:
        raise RuntimeError(f"Token refresh failed: {data}")
    print("Access token obtained.")
    return data["access_token"]


def coql(headers, query):
    print(f"\nQuery: {query}")
    resp = requests.post(COQL_URL, headers=headers, json={"select_query": query})
    print(f"Status: {resp.status_code}")
    try:
        body = resp.json()
    except Exception:
        print(f"Raw response: {resp.text[:500]}")
        return None
    print(json.dumps(body, indent=2)[:2000])
    return body


def main():
    token   = get_access_token()
    headers = {
        "Authorization": f"Zoho-oauthtoken {token}",
        "Content-Type":  "application/json",
    }

    # 0. Discover all module API names so we can find Equipment History's real name
    print("\n--- Test 0: list all CRM module API names ---")
    resp = requests.get(
        "https://www.zohoapis.com/crm/v2/settings/modules",
        headers=headers,
    )
    print(f"Status: {resp.status_code}")
    modules = resp.json().get("modules", [])
    for m in modules:
        print(f"  {m.get('api_name'):40s}  {m.get('module_name')}")

    # 1. Minimal test — confirm COQL endpoint responds (WHERE required by Zoho)
    print("\n--- Test 1: minimal COQL ping (one Deal) ---")
    coql(headers, "SELECT id, Deal_Name FROM Deals WHERE id is not null LIMIT 1")

    # 2. Issued_Equipment — try fields without the blocked multi-lookup
    #    Product_Details appeared before the error in the last run so may be valid
    print("\n--- Test 2: Issued_Equipment — try Product_Details, Quantity, No_of_Items ---")
    coql(headers, "SELECT id, Name, Product_Details, Quantity, No_of_Items FROM Issued_Equipment WHERE id is not null LIMIT 2")

    # 3. Issued_Equipment — try other likely item/qty field names
    print("\n--- Test 3: Issued_Equipment — try Description, Amount, Units ---")
    coql(headers, "SELECT id, Name, Description, Amount, Units FROM Issued_Equipment WHERE id is not null LIMIT 2")

    # 4. Fetch several Issued_Equipment names to see naming pattern
    print("\n--- Test 4: Issued_Equipment — 10 Name values to see naming convention ---")
    coql(headers, "SELECT id, Name FROM Issued_Equipment WHERE id is not null LIMIT 10")

    # 5. Try Equipment_History_Entries from the Deals side via COQL
    print("\n--- Test 5: Deals — try Equipment_History_Entries field ---")
    coql(headers, "SELECT id, Deal_Name, Equipment_History_Entries FROM Deals WHERE id is not null LIMIT 1")

    # 6. Try standard Products related records on a Deal (not COQL — standard REST)
    deal_id = "6673955000006164140"
    print(f"\n--- Test 6: Deals/{deal_id}/Products — standard REST related records ---")
    resp = requests.get(
        f"https://www.zohoapis.com/crm/v2/Deals/{deal_id}/Products",
        headers=headers,
    )
    print(f"Status: {resp.status_code}")
    print(json.dumps(resp.json(), indent=2)[:1000])


if __name__ == "__main__":
    main()
