#!/usr/bin/env python3
import sqlite3

con = sqlite3.connect("/home/ubuntu/meraki/boutique_vton/boutique.db")
rows = con.execute(
    """
    SELECT id, entry_date, invoice_number, customer_name
    FROM accounting_entries
    WHERE entry_type IN ('CREDIT', 'credit')
    ORDER BY entry_date ASC, id ASC
    """
).fetchall()
print("credit_count", len(rows))
for row in rows:
    print(row)
print(
    "next_should_be",
    f"2611{(len(rows) + 1):03d}" if rows else "2611001",
)
con.close()
