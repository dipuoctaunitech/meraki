from fastapi import APIRouter

from app.api.v1.endpoints import accounting, auth, salary

api_router: APIRouter = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(accounting.router)
api_router.include_router(salary.router)
