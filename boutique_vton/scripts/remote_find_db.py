#!/usr/bin/env python3
from pathlib import Path
import sqlite3

env = Path("/home/ubuntu/meraki/boutique_vton/.env").read_text(encoding="utf-8", errors="ignore")
for line in env.splitlines():
    if line.startswith("DATABASE_URL="):
        value = line.split("=", 1)[1].strip().strip('"').strip("'")
        print("raw", value)
        if value.startswith("sqlite:///"):
            path = value[len("sqlite:///") :]
            # sqlite:////abs => /abs ; sqlite:///rel => rel
            print("path", path)
            print("exists", Path(path).exists())
            if Path(path).exists():
                con = sqlite3.connect(path)
                n = con.execute(
                    "select count(1) from accounting_entries"
                ).fetchone()[0]
                c = con.execute(
                    "select count(1) from accounting_entries where entry_type='credit'"
                ).fetchone()[0]
                print("entries", n, "credits", c)
                print("cwd_db", Path("/home/ubuntu/meraki/boutique_vton/boutique.db").resolve())
                con.close()
        break
