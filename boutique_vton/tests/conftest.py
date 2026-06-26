from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.core.config import get_settings
from app.db.session import get_session
from app.main import app


@pytest.fixture
def test_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    """Provide an isolated API client backed by a temporary SQLite database."""
    db_file = tmp_path / "test.db"
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    monkeypatch.setenv("UPLOAD_DIR", str(upload_dir))
    get_settings.cache_clear()

    fresh_settings = get_settings()
    import app.core.config as config_module
    import app.db.session as db_session

    monkeypatch.setattr(config_module, "settings", fresh_settings)

    test_engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.drop_all(test_engine)
    SQLModel.metadata.create_all(test_engine)

    monkeypatch.setattr(db_session, "engine", test_engine)

    def override_get_session() -> Generator[Session, None, None]:
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    get_settings.cache_clear()
