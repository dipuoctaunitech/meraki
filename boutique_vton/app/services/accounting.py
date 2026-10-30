"""Business logic for accounting entries and reports."""

from datetime import date
from io import BytesIO
from typing import Optional

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font
from sqlmodel import Session, col, select

from app.models.accounting import (
    AccountingEntry,
    CatalogItem,
    Customer,
    EntryType,
    PaymentMethod,
)
from app.schemas.accounting import AccountingEntryCreate, AccountingSummary

PAYMENT_LABELS: dict[PaymentMethod, str] = {
    PaymentMethod.CASH: "Cash",
    PaymentMethod.GPAY: "GPay",
    PaymentMethod.BANK_HDFC: "Bank Transfer HDFC",
    PaymentMethod.BANK_ICICI: "Bank Transfer ICICI",
}


def get_customer_by_phone(session: Session, phone: str) -> Optional[Customer]:
    digits = "".join(ch for ch in phone if ch.isdigit())
    return session.exec(select(Customer).where(Customer.phone == digits)).first()


def search_customers_by_phone(
    session: Session,
    *,
    query: str,
    limit: int = 8,
) -> list[Customer]:
    digits = "".join(ch for ch in query if ch.isdigit())
    if len(digits) < 3:
        return []
    statement = (
        select(Customer)
        .where(col(Customer.phone).startswith(digits))
        .order_by(col(Customer.phone).asc())
        .limit(limit)
    )
    return list(session.exec(statement).all())


def upsert_customer(session: Session, name: str, phone: str) -> Customer:
    from datetime import datetime, timezone

    customer = get_customer_by_phone(session, phone)
    if customer is None:
        customer = Customer(name=name, phone=phone)
        session.add(customer)
        session.flush()
        return customer

    if customer.name != name:
        customer.name = name
        customer.updated_at = datetime.now(timezone.utc)
        session.add(customer)
        session.flush()
    return customer


def upsert_catalog_item(session: Session, name: str, price: float) -> CatalogItem:
    from datetime import datetime, timezone

    cleaned_name = name.strip()
    name_key = cleaned_name.casefold()
    item = session.exec(
        select(CatalogItem).where(CatalogItem.name_key == name_key)
    ).first()
    if item is None:
        item = CatalogItem(name=cleaned_name, name_key=name_key, price=price)
        session.add(item)
        session.flush()
        return item

    if item.name != cleaned_name or item.price != price:
        item.name = cleaned_name
        item.price = price
        item.updated_at = datetime.now(timezone.utc)
        session.add(item)
        session.flush()
    return item


def search_catalog_items(
    session: Session,
    *,
    query: str = "",
    limit: int = 10,
) -> list[CatalogItem]:
    statement = select(CatalogItem)
    cleaned = query.strip()
    if cleaned:
        statement = statement.where(
            col(CatalogItem.name_key).contains(cleaned.casefold())
        )
    statement = statement.order_by(col(CatalogItem.name).asc()).limit(limit)
    return list(session.exec(statement).all())


def create_entry(session: Session, payload: AccountingEntryCreate) -> AccountingEntry:
    customer_id: Optional[int] = None
    customer_name = payload.customer_name or "-"
    phone = payload.phone or ""

    if payload.entry_type == EntryType.CREDIT:
        customer = upsert_customer(session, customer_name, phone)
        customer_id = customer.id
        upsert_catalog_item(session, payload.item_name, payload.item_price)

    total = round(payload.item_price * payload.quantity, 2)
    entry = AccountingEntry(
        entry_type=payload.entry_type,
        entry_date=payload.entry_date,
        customer_id=customer_id,
        customer_name=customer_name,
        phone=phone,
        item_name=payload.item_name,
        item_price=payload.item_price,
        quantity=payload.quantity,
        total=total,
        is_paid=payload.is_paid,
        payment_method=payload.payment_method,
        notes=payload.notes,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def get_entry(session: Session, entry_id: int) -> Optional[AccountingEntry]:
    return session.get(AccountingEntry, entry_id)


def delete_entry(session: Session, entry_id: int) -> bool:
    entry = get_entry(session, entry_id)
    if entry is None:
        return False
    session.delete(entry)
    session.commit()
    return True


def _apply_filters(
    statement,
    *,
    entry_type: Optional[EntryType] = None,
    is_paid: Optional[bool] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    phone: Optional[str] = None,
):
    if entry_type is not None:
        statement = statement.where(AccountingEntry.entry_type == entry_type)
    if is_paid is not None:
        statement = statement.where(AccountingEntry.is_paid == is_paid)
    if date_from is not None:
        statement = statement.where(AccountingEntry.entry_date >= date_from)
    if date_to is not None:
        statement = statement.where(AccountingEntry.entry_date <= date_to)
    if phone:
        digits = "".join(ch for ch in phone if ch.isdigit())
        statement = statement.where(AccountingEntry.phone == digits)
    return statement


def list_entries(
    session: Session,
    *,
    entry_type: Optional[EntryType] = None,
    is_paid: Optional[bool] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    phone: Optional[str] = None,
    sort_order: str = "desc",
    limit: int = 100,
    offset: int = 0,
) -> list[AccountingEntry]:
    statement = select(AccountingEntry)
    statement = _apply_filters(
        statement,
        entry_type=entry_type,
        is_paid=is_paid,
        date_from=date_from,
        date_to=date_to,
        phone=phone,
    )
    ascending = sort_order == "asc"
    date_order = (
        col(AccountingEntry.entry_date).asc()
        if ascending
        else col(AccountingEntry.entry_date).desc()
    )
    id_order = (
        col(AccountingEntry.id).asc() if ascending else col(AccountingEntry.id).desc()
    )
    statement = statement.order_by(date_order, id_order).offset(offset).limit(limit)
    return list(session.exec(statement).all())


def get_summary(
    session: Session,
    *,
    entry_type: Optional[EntryType] = None,
    is_paid: Optional[bool] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> AccountingSummary:
    statement = select(AccountingEntry)
    statement = _apply_filters(
        statement,
        entry_type=entry_type,
        is_paid=is_paid,
        date_from=date_from,
        date_to=date_to,
    )
    entries = list(session.exec(statement).all())

    credit_total = sum(e.total for e in entries if e.entry_type == EntryType.CREDIT)
    debit_total = sum(e.total for e in entries if e.entry_type == EntryType.DEBIT)
    paid_total = sum(e.total for e in entries if e.is_paid)
    unpaid_total = sum(e.total for e in entries if not e.is_paid)

    return AccountingSummary(
        credit_total=round(credit_total, 2),
        debit_total=round(debit_total, 2),
        paid_total=round(paid_total, 2),
        unpaid_total=round(unpaid_total, 2),
        entry_count=len(entries),
    )


def build_excel_report(
    session: Session,
    *,
    entry_type: Optional[EntryType] = None,
    is_paid: Optional[bool] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort_order: str = "desc",
) -> bytes:
    entries = list_entries(
        session,
        entry_type=entry_type,
        is_paid=is_paid,
        date_from=date_from,
        date_to=date_to,
        sort_order=sort_order,
        limit=10_000,
        offset=0,
    )

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Accounting Report"

    headers = [
        "Date",
        "Type",
        "Customer Name",
        "Phone",
        "Item",
        "Price",
        "Quantity",
        "Total",
        "Paid",
        "Payment Method",
        "Notes",
    ]
    sheet.append(headers)
    for cell in sheet[1]:
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal="center")

    for entry in entries:
        method_label = (
            PAYMENT_LABELS.get(entry.payment_method, "")
            if entry.payment_method
            else ""
        )
        sheet.append(
            [
                entry.entry_date.isoformat(),
                entry.entry_type.value.capitalize(),
                entry.customer_name,
                entry.phone,
                entry.item_name,
                entry.item_price,
                entry.quantity,
                entry.total,
                "Yes" if entry.is_paid else "No",
                method_label,
                entry.notes or "",
            ]
        )

    summary = get_summary(
        session,
        entry_type=entry_type,
        is_paid=is_paid,
        date_from=date_from,
        date_to=date_to,
    )
    sheet.append([])
    sheet.append(["Summary"])
    sheet.append(["Credit Total", summary.credit_total])
    sheet.append(["Debit Total", summary.debit_total])
    sheet.append(["Paid Total", summary.paid_total])
    sheet.append(["Unpaid Total", summary.unpaid_total])
    sheet.append(["Entry Count", summary.entry_count])

    widths = [12, 10, 22, 14, 24, 10, 10, 12, 8, 22, 30]
    for index, width in enumerate(widths, start=1):
        sheet.column_dimensions[chr(64 + index)].width = width

    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
