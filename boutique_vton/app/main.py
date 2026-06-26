from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.db.session import create_db_and_tables

setup_logging()

app: FastAPI = FastAPI(title=settings.project_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

uploads_path: Path = Path(settings.upload_dir)
uploads_path.mkdir(parents=True, exist_ok=True)
(uploads_path / "products").mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(uploads_path)), name="static")


@app.on_event("startup")
def on_startup() -> None:
    """Initialize database tables for local development."""
    create_db_and_tables()


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Basic health check endpoint for monitoring."""
    return {"status": "ok"}
