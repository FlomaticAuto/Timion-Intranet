import argparse
import calendar
import json
import os
import requests
from datetime import datetime, timezone

ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"
ZOHO_CRM_BASE  = "https://www.zohoapis.com/crm/v2"
MODULE         = "Visits_History"

# ── Field API names ────────────────────────────────────────────────────────────
# Run `python scripts/fetch_zoho_crm.py --list-fields` to print every field's
# API name, display label, and type for your org, then update these constants.
#
# Note: if the Zoho OAuth client that covers Inventory also has CRM scope
# (ZohoCRM.modules.Visits_History.READ or ZohoCRM.modules.ALL.READ), you can
# reuse the same values for ZOHO_CRM_CLIENT_ID / ZOHO_CRM_CLIENT_SECRET /
# ZOHO_CRM_REFRESH_TOKEN in your GitHub Secrets.  If CRM uses a separate
# OAuth client, add three new secrets with those values instead.
FIELD_DATE      = "Date"   # date field for the visit
FIELD_THERAPIST = "Staff_2"       # lookup or text — therapist who conducted the visit
FIELD_TYPE      = "Type"      # picklist — type of visit
FIELD_LOCATION  = "Location"        # text or picklist — where the visit took place


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


def list_fields(headers):
    """Print all field API names, display labels, and types for the module."""
    url  = f"{ZOHO_CRM_BASE}/settings/fields"
    resp = requests.get(url, headers=headers, params={"module": MODULE})
    resp.raise_for_status()
    fields = resp.json().get("fields", [])
    print(f"\nFields in module '{MODULE}':\n")
    print(f"{'API Name':<45} {'Display Label':<40} {'Type'}")
    print("-" * 100)
    for f in sorted(fields, key=lambda x: x.get("api_name", "")):
        print(f"{f.get('api_name', ''):<45} {f.get('field_label', ''):<40} {f.get('data_type', '')}")
    print(f"\n{len(fields)} fields total.")


def str_value(raw):
    """Extract a plain string from a scalar or a Zoho lookup object."""
    if raw is None:
        return ""
    if isinstance(raw, dict):
        return raw.get("name") or raw.get("full_name") or ""
    return str(raw)


def fetch_all_records(headers):
    """Page through the full module and return every record."""
    records = []
    page    = 1
    while True:
        resp = requests.get(
            f"{ZOHO_CRM_BASE}/{MODULE}",
            headers=headers,
            params={"page": page, "per_page": 200},
        )
        if resp.status_code == 204:
            break  # no more records
        if not resp.ok:
            print(f"  HTTP {resp.status_code} — {resp.text[:300]}")
            resp.raise_for_status()
        body = resp.json()
        records.extend(body.get("data", []))
        print(f"  Page {page}: {len(body.get('data', []))} records")
        if not body.get("info", {}).get("more_records", False):
            break
        page += 1
    return records


def fetch_month(headers, month_str):
    """Fetch visits for the given month. Zoho CRM Date fields don't support
    comparison operators in /search criteria, so we fetch all records and
    filter by month in Python."""
    year, mon = map(int, month_str.split("-"))
    last_day  = calendar.monthrange(year, mon)[1]
    start = f"{month_str}-01"
    end   = f"{month_str}-{last_day:02d}"

    all_records = fetch_all_records(headers)
    print(f"  {len(all_records)} total records fetched — filtering for {month_str}")

    visits = []
    for r in all_records:
        date_val = str_value(r.get(FIELD_DATE, ""))
        if start <= date_val <= end:
            visits.append({
                "id":         r.get("id", ""),
                "date":       date_val,
                "therapist":  str_value(r.get(FIELD_THERAPIST, "")),
                "visit_type": str_value(r.get(FIELD_TYPE, "")),
                "location":   str_value(r.get(FIELD_LOCATION, "")),
            })

    visits.sort(key=lambda v: v["date"])
    return visits


def update_index(index_file, month_str):
    months = []
    if os.path.exists(index_file):
        try:
            with open(index_file) as f:
                months = json.load(f)
        except Exception:
            pass
    if month_str not in months:
        months.append(month_str)
    months.sort(reverse=True)
    with open(index_file, "w") as f:
        json.dump(months, f, indent=2)
    return months


def write_month(now_str, now_month, month_str, visits):
    """Write a single month's JSON file and return the output dict."""
    output = {
        "generated_at": now_str,
        "month":        month_str,
        "total":        len(visits),
        "visits":       sorted(visits, key=lambda v: v["date"]),
    }
    month_file = f"public/data/crm/{month_str}.json"
    with open(month_file, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Wrote {month_file} ({len(visits)} visits)")
    if month_str == now_month:
        with open("public/data/crm/latest.json", "w") as f:
            json.dump(output, f, indent=2)
        print("  Wrote public/data/crm/latest.json")
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--month", metavar="YYYY-MM",
        help="Single month to fetch (default: current month)",
    )
    parser.add_argument(
        "--all-months", action="store_true",
        help="Fetch all records once and write a file for every month found",
    )
    parser.add_argument(
        "--list-fields", action="store_true",
        help=f"Print all field API names for '{MODULE}' and exit",
    )
    args = parser.parse_args()

    client_id     = os.environ["ZOHO_CRM_CLIENT_ID"]
    client_secret = os.environ["ZOHO_CRM_CLIENT_SECRET"]
    refresh_token = os.environ["ZOHO_CRM_REFRESH_TOKEN"]

    print("Refreshing Zoho CRM access token...")
    token   = get_access_token(client_id, client_secret, refresh_token)
    headers = {"Authorization": f"Zoho-oauthtoken {token}"}

    if args.list_fields:
        list_fields(headers)
        return

    now       = datetime.now(timezone.utc)
    now_str   = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    now_month = now.strftime("%Y-%m")

    os.makedirs("public/data/crm", exist_ok=True)

    if args.all_months:
        print(f"Fetching ALL records from {MODULE}...")
        all_records = fetch_all_records(headers)
        print(f"  {len(all_records)} total records")

        # Group by month
        by_month: dict[str, list] = {}
        for r in all_records:
            date_val = str_value(r.get(FIELD_DATE, ""))
            if not date_val or len(date_val) < 7:
                continue
            month_key = date_val[:7]  # YYYY-MM
            by_month.setdefault(month_key, []).append({
                "id":         r.get("id", ""),
                "date":       date_val,
                "therapist":  str_value(r.get(FIELD_THERAPIST, "")),
                "visit_type": str_value(r.get(FIELD_TYPE, "")),
                "location":   str_value(r.get(FIELD_LOCATION, "")),
            })

        print(f"\nWriting {len(by_month)} month file(s):")
        all_months = []
        for month_str in sorted(by_month):
            write_month(now_str, now_month, month_str, by_month[month_str])
            all_months.append(month_str)

        # Ensure latest.json exists even if current month has no records
        if now_month not in by_month:
            write_month(now_str, now_month, now_month, [])
            all_months.append(now_month)

        all_months = sorted(set(all_months), reverse=True)
        with open("public/data/crm/index.json", "w") as f:
            json.dump(all_months, f, indent=2)
        print(f"\nWrote public/data/crm/index.json — {len(all_months)} months: {all_months}")
        return

    # Single-month mode
    month_str = args.month or now_month
    print(f"Target month: {month_str}")
    print(f"Fetching visits from {MODULE}...")
    visits = fetch_month(headers, month_str)
    print(f"  {len(visits)} visits in {month_str}")

    write_month(now_str, now_month, month_str, visits)

    months = update_index("public/data/crm/index.json", month_str)
    print(f"Wrote public/data/crm/index.json — available months: {months}")


if __name__ == "__main__":
    main()
