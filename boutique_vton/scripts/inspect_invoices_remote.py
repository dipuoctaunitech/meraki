import os
import sqlite3

paths = [
    "/home/ubuntu/meraki/boutique_vton/boutique.db",
    "/var/lib/meraki/boutique.db",
    "/home/ubuntu/meraki/boutique_vton/app/boutique.db",
]
for root, _dirs, files in os.walk("/home/ubuntu/meraki"):
    for name in files:
        if name.endswith(".db"):
            paths.append(os.path.join(root, name))

seen: set[str] = set()
for db in paths:
    if db in seen or not os.path.exists(db):
        continue
    seen.add(db)
    con = sqlite3.connect(db)
    tables = [
        row[0]
        for row in con.execute(
            "select name from sqlite_master where type='table'"
        )
    ]
    if "accounting_entries" not in tables:
        print(db, "no accounting_entries")
        con.close()
        continue
    cols = [row[1] for row in con.execute("PRAGMA table_info(accounting_entries)")]
    credits = con.execute(
        "select count(1) from accounting_entries where entry_type='credit'"
    ).fetchone()[0]
    if "invoice_number" in cols:
        missing = con.execute(
            "select count(1) from accounting_entries where entry_type='credit' "
            "and (invoice_number is null or invoice_number='')"
        ).fetchone()[0]
        rows = con.execute(
            "select id, entry_date, invoice_number, customer_name "
            "from accounting_entries where entry_type='credit' "
            "order by entry_date, id limit 8"
        ).fetchall()
    else:
        missing = "n/a"
        rows = con.execute(
            "select id, entry_date, customer_name from accounting_entries "
            "where entry_type='credit' order by entry_date, id limit 8"
        ).fetchall()
    print("DB", db)
    print("invoice_col", "invoice_number" in cols, "credits", credits, "missing", missing)
    print("rows", rows)
    con.close()
