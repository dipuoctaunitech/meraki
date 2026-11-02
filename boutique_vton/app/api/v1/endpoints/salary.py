"""Salary API endpoints."""

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlmodel import Session

from app.core.auth import require_accounts_user
from app.db.session import get_session
from app.schemas.salary import SalaryRecordCreate, SalaryRecordRead
from app.services import salary as salary_service

SortOrder = Literal["asc", "desc"]

router = APIRouter(
    prefix="/accounting/salaries",
    tags=["salaries"],
    dependencies=[Depends(require_accounts_user)],
)


def _validate_date_range(
    date_from: Optional[date],
    date_to: Optional[date],
) -> None:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from cannot be after date_to",
        )


@router.get("", response_model=list[SalaryRecordRead])
def list_salary_records(
    name: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    sort_order: SortOrder = Query(default="asc"),
    session: Session = Depends(get_session),
) -> list[SalaryRecordRead]:
    _validate_date_range(date_from, date_to)
    return salary_service.list_salaries(
        session,
        name=name,
        date_from=date_from,
        date_to=date_to,
        sort_order=sort_order,
    )


@router.post(
    "",
    response_model=SalaryRecordRead,
    status_code=status.HTTP_201_CREATED,
)
def create_salary_record(
    payload: SalaryRecordCreate,
    session: Session = Depends(get_session),
) -> SalaryRecordRead:
    return salary_service.create_salary(session, payload)


@router.get("/names", response_model=list[str])
def search_salary_names(
    q: str = Query(default=""),
    limit: int = Query(default=8, ge=1, le=50),
    session: Session = Depends(get_session),
) -> list[str]:
    return salary_service.search_salary_names(session, query=q, limit=limit)


@router.get("/reports/export")
def export_salary_report(
    name: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    sort_order: SortOrder = Query(default="asc"),
    session: Session = Depends(get_session),
) -> Response:
    _validate_date_range(date_from, date_to)
    content = salary_service.build_excel_report(
        session,
        name=name,
        date_from=date_from,
        date_to=date_to,
        sort_order=sort_order,
    )
    filename = "salary-report.xlsx"
    if name:
        safe = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in name.strip())
        filename = f"salary-report-{safe[:40] or 'filtered'}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.put("/{salary_id}", response_model=SalaryRecordRead)
def update_salary_record(
    salary_id: int,
    payload: SalaryRecordCreate,
    session: Session = Depends(get_session),
) -> SalaryRecordRead:
    record = salary_service.update_salary(session, salary_id, payload)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salary record not found",
        )
    return record


@router.delete("/{salary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary_record(
    salary_id: int,
    session: Session = Depends(get_session),
) -> Response:
    deleted = salary_service.delete_salary(session, salary_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salary record not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
