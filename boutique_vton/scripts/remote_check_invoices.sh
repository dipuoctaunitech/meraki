#!/usr/bin/env bash
set -euo pipefail
cd /home/ubuntu/meraki/boutique_vton

echo "=== DATABASE_URL path only ==="
python3 - <<'PY'
from pathlib import Path
text = Path(".env").read_text(encoding="utf-8", errors="ignore")
for line in text.splitlines():
    if line.startswith("DATABASE_URL="):
        value = line.split("=", 1)[1].strip()
        # Print only scheme + whether absolute/relative and basename
        if "://" in value:
            scheme, rest = value.split("://", 1)
            print("scheme", scheme)
            print("basename", Path(rest.replace("///", "/")).name)
            print("abspath_guess", str(Path(rest.replace("///", "/")).resolve()) if rest else "")
        else:
            print("raw_set")
        break
PY

echo "=== find db files ==="
find /home/ubuntu/meraki -name "*.db" -type f 2>/dev/null || true

echo "=== health ==="
curl -sS http://127.0.0.1:8000/health || true
echo

echo "=== login + entries ==="
LOGIN=$(curl -sS -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"meraki123"}')
TOKEN=$(python3 - <<PY
import json
print(json.loads('''$LOGIN''').get("access_token",""))
PY
)
echo "token_len=${#TOKEN}"
ENTRIES=$(curl -sS http://127.0.0.1:8000/api/v1/accounting/entries \
  -H "Authorization: Bearer $TOKEN")
python3 - <<PY
import json
raw = '''$ENTRIES'''
try:
    data = json.loads(raw)
except Exception as exc:
    print("parse_error", exc)
    print(raw[:300])
    raise SystemExit(0)
print("entries", len(data) if isinstance(data, list) else data)
if isinstance(data, list) and data:
    first = data[0]
    print("keys", sorted(first.keys()))
    print("sample", {
        "id": first.get("id"),
        "entry_type": first.get("entry_type"),
        "entry_date": first.get("entry_date"),
        "invoice_number": first.get("invoice_number"),
        "customer_name": first.get("customer_name"),
    })
    credits = [e for e in data if e.get("entry_type") == "credit"]
    print("credits_in_page", len(credits))
    print("with_invoice", sum(1 for e in credits if e.get("invoice_number")))
PY

echo "=== git head / invoice code present ==="
cd /home/ubuntu/meraki
git log -1 --oneline
grep -n "invoice_number\|next_invoice_number\|backfill_invoice" boutique_vton/app/services/accounting.py | head
grep -n "invoice_number" boutique_vton/app/models/accounting.py | head
