from fastapi import APIRouter

from app.api.v1.endpoints import accounting

api_router: APIRouter = APIRouter()
api_router.include_router(accounting.router)
