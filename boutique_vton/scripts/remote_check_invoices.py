#!/usr/bin/env python3
import json
import os
import sqlite3
import urllib.request
from pathlib import Path

root = Path("/home/ubuntu/meraki/boutique_vton")
os.chdir(root)

print("=== env database basename ===")
env = Path(".env")
if env.exists():
    for line in env.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.startswith("DATABASE_URL="):
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            print("DATABASE_URL_basename", Path(value.split("://", 1)[-1]).name)
            print("DATABASE_URL_is_abs", value.split("://", 1)[-1].startswith("/"))
            break

print("=== db files ===")
for path in Path("/home/ubuntu/meraki").rglob("*.db"):
    print(path)

print("=== health ===")
print(urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=10).read().decode())

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/auth/login",
    data=json.dumps({"username": "admin", "password": "meraki123"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
login = json.loads(urllib.request.urlopen(req, timeout=10).read().decode())
token = login.get("access_token", "")
print("token_len", len(token))

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/accounting/entries",
    headers={"Authorization": f"Bearer {token}"},
)
entries = json.loads(urllib.request.urlopen(req, timeout=10).read().decode())
print("entries", len(entries) if isinstance(entries, list) else entries)
if isinstance(entries, list) and entries:
    first = entries[0]
    print("keys", sorted(first.keys()))
    credits = [e for e in entries if e.get("entry_type") == "credit"]
    print("credits_in_page", len(credits))
    print("with_invoice", sum(1 for e in credits if e.get("invoice_number")))
    for e in credits[:5]:
        print(
            e.get("id"),
            e.get("entry_date"),
            e.get("invoice_number"),
            e.get("customer_name"),
        )

print("=== code markers ===")
acct = Path("app/services/accounting.py").read_text(encoding="utf-8", errors="ignore")
model = Path("app/models/accounting.py").read_text(encoding="utf-8", errors="ignore")
print("has_next_invoice", "next_invoice_number" in acct)
print("has_backfill", "backfill_invoice_numbers" in acct)
print("model_has_invoice", "invoice_number" in model)
