import argparse
import calendar
import json
import os
import requests
from datetime import datetime, timezone

ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"
ZOHO_CRM_BASE  = "https://www.zohoapis.com/crm/v2"
MODULE         = "Issued_Equipment"

# Oldest month to include when running --all-months (YYYY-MM, inclusive).
FROM_MONTH = "2025-12"

FIELD_NAME            = "Name"            # equipment name & referral date (record title)
FIELD_PATIENT         = "Patient"         # lookup → patient/customer
FIELD_DEVICE          = "Device_Equipment"# lookup or picklist — device/equipment type
FIELD_QTY             = "Qty"             # quantity issued
FIELD_ORDER_DATE      = "Order_Date"      # date used for monthly grouping
FIELD_APPROVAL_STATUS = "Approval_Status" # picklist — approval workflow state
FIELD_ORDER_FROM      = "Order_from"      # referral source
FIELD_STATUS          = "Status"          # picklist — mirrors order process stage


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
    """Extract a plain string from a scalar or a Zoho lookup object."""
    if raw is None:
        return ""
    if isinstance(raw, dict):
        return raw.get("name") or raw.get("full_name") or ""
    return str(raw)


def normalize(s: str) -> str:
    """Replace curly/smart quotes with straight ASCII equivalents.
    Zoho CRM stores some picklist values with U+2018/U+2019 apostrophes
    which break exact-match lookups in the dashboard."""
    return (s
            .replace("‘", "'").replace("’", "'")
            .replace("“", '"').replace("”", '"'))


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
            break
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


def build_record(r):
    return {
        "id":              r.get("id", ""),
        "name":            normalize(str_value(r.get(FIELD_NAME, ""))),
        "patient":         normalize(str_value(r.get(FIELD_PATIENT, ""))),
        "device":          normalize(str_value(r.get(FIELD_DEVICE, ""))),
        "qty":             str_value(r.get(FIELD_QTY, "")),
        "order_date":      str_value(r.get(FIELD_ORDER_DATE, "")),
        "approval_status": normalize(str_value(r.get(FIELD_APPROVAL_STATUS, ""))),
        "order_from":      normalize(str_value(r.get(FIELD_ORDER_FROM, ""))),
        "status":          normalize(str_value(r.get(FIELD_STATUS, ""))),
    }


def fetch_month(headers, month_str):
    """Fetch equipment records for the given month.
    Zoho CRM Date fields don't support comparison operators in /search criteria,
    so we fetch all records and filter in Python."""
    year, mon = map(int, month_str.split("-"))
    last_day  = calendar.monthrange(year, mon)[1]
    start = f"{month_str}-01"
    end   = f"{month_str}-{last_day:02d}"

    all_records = fetch_all_records(headers)
    print(f"  {len(all_records)} total records fetched — filtering for {month_str}")

    items = []
    for r in all_records:
        date_val = str_value(r.get(FIELD_ORDER_DATE, ""))
        if start <= date_val <= end:
            items.append(build_record(r))

    items.sort(key=lambda v: v["order_date"])
    return items


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


def write_month(now_str, now_month, month_str, items, data_dir):
    """Write a single month's JSON file and return the output dict."""
    output = {
        "generated_at": now_str,
        "month":        month_str,
        "total":        len(items),
        "items":        sorted(items, key=lambda v: v["order_date"]),
    }
    month_file = f"{data_dir}/{month_str}.json"
    with open(month_file, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Wrote {month_file} ({len(items)} records)")
    if month_str == now_month:
        with open(f"{data_dir}/latest.json", "w") as f:
            json.dump(output, f, indent=2)
        print(f"  Wrote {data_dir}/latest.json")
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--month", metavar="YYYY-MM",
                        help="Single month to fetch (default: current month)")
    parser.add_argument("--all-months", action="store_true",
                        help="Fetch all records and write a file for every month found")
    args = parser.parse_args()

    client_id     = os.environ["ZOHO_CRM_CLIENT_ID"]
    client_secret = os.environ["ZOHO_CRM_CLIENT_SECRET"]
    refresh_token = os.environ["ZOHO_CRM_REFRESH_TOKEN"]

    print("Refreshing Zoho CRM access token...")
    token   = get_access_token(client_id, client_secret, refresh_token)
    headers = {"Authorization": f"Zoho-oauthtoken {token}"}

    now       = datetime.now(timezone.utc)
    now_str   = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    now_month = now.strftime("%Y-%m")

    data_dir = "public/data/crm/equipment"
    os.makedirs(data_dir, exist_ok=True)

    if args.all_months:
        print(f"Fetching ALL records from {MODULE}...")
        all_records = fetch_all_records(headers)
        print(f"  {len(all_records)} total records")

        by_month: dict[str, list] = {}
        for r in all_records:
            date_val = str_value(r.get(FIELD_ORDER_DATE, ""))
            if not date_val or len(date_val) < 7:
                continue
            month_key = date_val[:7]
            if month_key < FROM_MONTH or month_key > now_month:
                continue  # skip records before cutoff or with future/typo dates
            by_month.setdefault(month_key, []).append(build_record(r))

        print(f"\nWriting {len(by_month)} month file(s):")
        all_months = []
        for month_str in sorted(by_month):
            write_month(now_str, now_month, month_str, by_month[month_str], data_dir)
            all_months.append(month_str)

        if now_month not in by_month:
            write_month(now_str, now_month, now_month, [], data_dir)
            all_months.append(now_month)

        all_months = sorted(set(all_months), reverse=True)
        with open(f"{data_dir}/index.json", "w") as f:
            json.dump(all_months, f, indent=2)
        print(f"\nWrote {data_dir}/index.json — {len(all_months)} months: {all_months}")
        return

    month_str = args.month or now_month
    print(f"Target month: {month_str}")
    print(f"Fetching equipment records from {MODULE}...")
    items = fetch_month(headers, month_str)
    print(f"  {len(items)} records in {month_str}")

    write_month(now_str, now_month, month_str, items, data_dir)

    months = update_index(f"{data_dir}/index.json", month_str)
    print(f"Wrote {data_dir}/index.json — available months: {months}")


if __name__ == "__main__":
    main()
