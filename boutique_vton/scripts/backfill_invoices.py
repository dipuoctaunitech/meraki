"""One-off: ensure invoice column exists and backfill credit entries."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from sqlmodel import Session

from app.db.session import create_db_and_tables, engine
from app.services.accounting import backfill_invoice_numbers


def main() -> None:
    db_path = Path(__file__).resolve().parents[1] / "boutique.db"
    print(f"db={db_path} exists={db_path.exists()}")

    create_db_and_tables()

    with Session(engine) as session:
        updated = backfill_invoice_numbers(session)
        print(f"backfill_updated={updated}")

    conn = sqlite3.connect(db_path)
    cols = [row[1] for row in conn.execute("PRAGMA table_info(accounting_entries)")]
    print(f"has_invoice_column={'invoice_number' in cols}")
    rows = list(
        conn.execute(
            """
            SELECT id, entry_date, invoice_number, customer_name
            FROM accounting_entries
            WHERE entry_type = 'credit'
            ORDER BY entry_date ASC, id ASC
            """
        )
    )
    print(f"credit_count={len(rows)}")
    for row in rows[:15]:
        print(row)
    missing = sum(1 for row in rows if not row[2])
    print(f"missing_invoice={missing}")
    conn.close()


if __name__ == "__main__":
    main()
