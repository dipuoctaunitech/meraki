#!/usr/bin/env python3
import json
import urllib.request

login = json.loads(
    urllib.request.urlopen(
        urllib.request.Request(
            "http://127.0.0.1:8000/api/v1/auth/login",
            data=json.dumps(
                {"username": "admin", "password": "meraki123"}
            ).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        ),
        timeout=10,
    )
    .read()
    .decode()
)
token = login["access_token"]
headers = {"Authorization": f"Bearer {token}"}

next_req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/accounting/invoices/next?entry_date=2026-11-03",
    headers=headers,
)
print("next", urllib.request.urlopen(next_req, timeout=10).read().decode())

entries = json.loads(
    urllib.request.urlopen(
        urllib.request.Request(
            "http://127.0.0.1:8000/api/v1/accounting/entries",
            headers=headers,
        ),
        timeout=10,
    )
    .read()
    .decode()
)
credits = [e for e in entries if e.get("entry_type") == "credit"]
ordered = sorted(credits, key=lambda e: (e["entry_date"], e["id"]))
print("credits", len(credits))
print("with_invoice", sum(1 for e in credits if e.get("invoice_number")))
print("first", ordered[0]["invoice_number"], ordered[0]["customer_name"])
print("last", ordered[-1]["invoice_number"], ordered[-1]["customer_name"])
for row in ordered:
    print(row["invoice_number"], row["entry_date"], row["customer_name"])
