#!/usr/bin/env python3
import sqlite3
from pathlib import Path

db = Path("/home/ubuntu/meraki/boutique_vton/boutique.db")
print("db", db, "exists", db.exists(), "size", db.stat().st_size if db.exists() else None)
con = sqlite3.connect(db)
print("tables", [r[0] for r in con.execute("select name from sqlite_master where type='table'")])
print("total", con.execute("select count(1) from accounting_entries").fetchone()[0])
print("by_type", list(con.execute("select entry_type, count(1) from accounting_entries group by entry_type")))
print("sample", list(con.execute("select id, entry_type, entry_date, customer_name from accounting_entries order by id desc limit 10")))
# Also check process cwd open files hint via systemd env
con.close()
