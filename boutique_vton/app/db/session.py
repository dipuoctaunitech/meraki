from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

engine_options: dict[str, object] = {"echo": False}
if settings.database_url.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **engine_options)


def create_db_and_tables() -> None:
    """Create DB tables for local/dev bootstrap."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Yield a SQLModel database session for request scope."""
    with Session(engine) as session:
        yield session
