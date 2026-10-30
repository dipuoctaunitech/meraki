"""Accounting API endpoints."""

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlmodel import Session

from app.db.session import get_session
from app.models.accounting import EntryType
from app.schemas.accounting import (
    AccountingEntryCreate,
    AccountingEntryRead,
    AccountingSummary,
    CatalogItemRead,
    CustomerRead,
)
from app.services import accounting as accounting_service

router = APIRouter(prefix="/accounting", tags=["accounting"])

SortOrder = Literal["asc", "desc"]


def _validate_date_range(
    date_from: Optional[date],
    date_to: Optional[date],
) -> None:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from cannot be after date_to",
        )


@router.post(
    "/entries",
    response_model=AccountingEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_accounting_entry(
    payload: AccountingEntryCreate,
    session: Session = Depends(get_session),
) -> AccountingEntryRead:
    entry = accounting_service.create_entry(session, payload)
    return AccountingEntryRead.model_validate(entry)


@router.put(
    "/entries/{entry_id}",
    response_model=AccountingEntryRead,
)
def update_accounting_entry(
    entry_id: int,
    payload: AccountingEntryCreate,
    session: Session = Depends(get_session),
) -> AccountingEntryRead:
    entry = accounting_service.update_entry(session, entry_id, payload)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found",
        )
    return AccountingEntryRead.model_validate(entry)


@router.delete(
    "/entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_accounting_entry(
    entry_id: int,
    session: Session = Depends(get_session),
) -> Response:
    deleted = accounting_service.delete_entry(session, entry_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/entries", response_model=list[AccountingEntryRead])
def list_accounting_entries(
    entry_type: Optional[EntryType] = Query(default=None),
    is_paid: Optional[bool] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    phone: Optional[str] = Query(default=None),
    sort_order: SortOrder = Query(default="desc"),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> list[AccountingEntryRead]:
    _validate_date_range(date_from, date_to)
    entries = accounting_service.list_entries(
        session,
        entry_type=entry_type,
        is_paid=is_paid,
        date_from=date_from,
        date_to=date_to,
        phone=phone,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
    return [AccountingEntryRead.model_validate(entry) for entry in entries]


@router.get("/summary", response_model=AccountingSummary)
def get_accounting_summary(
    entry_type: Optional[EntryType] = Query(default=None),
    is_paid: Optional[bool] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    session: Session = Depends(get_session),
) -> AccountingSummary:
    _validate_date_range(date_from, date_to)
    return accounting_service.get_summary(
        session,
        entry_type=entry_type,
        is_paid=is_paid,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/customers/by-phone/{phone}", response_model=CustomerRead)
def lookup_customer_by_phone(
    phone: str,
    session: Session = Depends(get_session),
) -> CustomerRead:
    customer = accounting_service.get_customer_by_phone(session, phone)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    return CustomerRead.model_validate(customer)


@router.get("/customers", response_model=list[CustomerRead])
def search_customers(
    q: str = Query(default=""),
    limit: int = Query(default=8, ge=1, le=50),
    session: Session = Depends(get_session),
) -> list[CustomerRead]:
    customers = accounting_service.search_customers_by_phone(
        session,
        query=q,
        limit=limit,
    )
    return [CustomerRead.model_validate(customer) for customer in customers]


@router.get("/items", response_model=list[CatalogItemRead])
def search_catalog_items(
    q: str = Query(default=""),
    limit: int = Query(default=10, ge=1, le=50),
    session: Session = Depends(get_session),
) -> list[CatalogItemRead]:
    items = accounting_service.search_catalog_items(session, query=q, limit=limit)
    return [CatalogItemRead.model_validate(item) for item in items]


@router.get("/reports/export")
def export_accounting_report(
    entry_type: Optional[EntryType] = Query(default=None),
    is_paid: Optional[bool] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    sort_order: SortOrder = Query(default="desc"),
    session: Session = Depends(get_session),
) -> Response:
    _validate_date_range(date_from, date_to)

    content = accounting_service.build_excel_report(
        session,
        entry_type=entry_type,
        is_paid=is_paid,
        date_from=date_from,
        date_to=date_to,
        sort_order=sort_order,
    )
    filename = "accounting-report.xlsx"
    if date_from or date_to:
        start = date_from.isoformat() if date_from else "start"
        end = date_to.isoformat() if date_to else "end"
        filename = f"accounting-report-{start}-to-{end}.xlsx"

    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
