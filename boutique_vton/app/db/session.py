from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
import app.models  # noqa: F401 — register SQLModel tables

engine_options: dict[str, object] = {"echo": False}
if settings.database_url.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **engine_options)


def _ensure_invoice_number_column() -> None:
    """Add invoice_number to existing SQLite DBs that predate the column."""
    if not settings.database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "accounting_entries" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("accounting_entries")}
    if "invoice_number" in columns:
        return
    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE accounting_entries "
                "ADD COLUMN invoice_number VARCHAR(20)"
            )
        )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "ix_accounting_entries_invoice_number "
                "ON accounting_entries (invoice_number)"
            )
        )


def create_db_and_tables() -> None:
    """Create DB tables for local/dev bootstrap and apply light migrations."""
    SQLModel.metadata.create_all(engine)
    _ensure_invoice_number_column()
    from app.services.accounting import backfill_invoice_numbers

    with Session(engine) as session:
        backfill_invoice_numbers(session)


def get_session() -> Generator[Session, None, None]:
    """Yield a SQLModel database session for request scope."""
    with Session(engine) as session:
        yield session
