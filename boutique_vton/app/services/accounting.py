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
    PaymentMethod.GPAY: "UPI",
    PaymentMethod.BANK_HDFC: "HDFC Bank Transfer",
    PaymentMethod.BANK_ICICI: "UPI Axis",
}


def invoice_month_prefix(entry_date: date) -> str:
    """Return YYMM prefix, e.g. Nov 2026 → 2611."""
    return f"{entry_date.year % 100:02d}{entry_date.month:02d}"


def format_invoice_number(entry_date: date, sequence: int) -> str:
    """Build invoice like 2611001 (min 3-digit sequence)."""
    return f"{invoice_month_prefix(entry_date)}{sequence:03d}"


def _max_invoice_sequence(session: Session, prefix: str) -> int:
    rows = session.exec(
        select(AccountingEntry.invoice_number).where(
            AccountingEntry.entry_type == EntryType.CREDIT,
            col(AccountingEntry.invoice_number).like(f"{prefix}%"),
        )
    ).all()
    max_seq = 0
    for invoice in rows:
        if not invoice or not invoice.startswith(prefix):
            continue
        suffix = invoice[len(prefix) :]
        if suffix.isdigit():
            max_seq = max(max_seq, int(suffix))
    return max_seq


def next_invoice_number(session: Session, entry_date: date) -> str:
    prefix = invoice_month_prefix(entry_date)
    return format_invoice_number(entry_date, _max_invoice_sequence(session, prefix) + 1)


def backfill_invoice_numbers(session: Session) -> int:
    """Assign invoice numbers to existing credit entries missing one.

    Oldest first within each month (by entry_date, then id).
    """
    entries = list(
        session.exec(
            select(AccountingEntry)
            .where(AccountingEntry.entry_type == EntryType.CREDIT)
            .where(
                (AccountingEntry.invoice_number == None)  # noqa: E711
                | (AccountingEntry.invoice_number == "")
            )
            .order_by(
                col(AccountingEntry.entry_date).asc(),
                col(AccountingEntry.id).asc(),
            )
        ).all()
    )
    if not entries:
        return 0

    updated = 0
    # Track highest assigned seq per prefix during this backfill pass
    seq_by_prefix: dict[str, int] = {}
    for entry in entries:
        prefix = invoice_month_prefix(entry.entry_date)
        if prefix not in seq_by_prefix:
            seq_by_prefix[prefix] = _max_invoice_sequence(session, prefix)
        seq_by_prefix[prefix] += 1
        entry.invoice_number = format_invoice_number(
            entry.entry_date, seq_by_prefix[prefix]
        )
        session.add(entry)
        updated += 1

    if updated:
        session.commit()
    return updated


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


def search_person_names(
    session: Session,
    *,
    query: str,
    limit: int = 8,
) -> list[str]:
    cleaned = query.strip()
    if len(cleaned) < 1:
        return []

    entry_names = list(
        session.exec(
            select(AccountingEntry.customer_name)
            .where(col(AccountingEntry.customer_name).ilike(f"%{cleaned}%"))
            .where(AccountingEntry.customer_name != "-")
            .distinct()
            .order_by(col(AccountingEntry.customer_name).asc())
            .limit(limit * 2)
        ).all()
    )
    customer_names = list(
        session.exec(
            select(Customer.name)
            .where(col(Customer.name).ilike(f"%{cleaned}%"))
            .distinct()
            .order_by(col(Customer.name).asc())
            .limit(limit * 2)
        ).all()
    )

    seen: set[str] = set()
    results: list[str] = []
    for name in [*entry_names, *customer_names]:
        key = name.strip().lower()
        if not key or key == "-" or key in seen:
            continue
        seen.add(key)
        results.append(name.strip())
        if len(results) >= limit:
            break
    return results


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

    invoice_number: Optional[str] = None
    if payload.entry_type == EntryType.CREDIT:
        if phone:
            customer = upsert_customer(session, customer_name, phone)
            customer_id = customer.id
        upsert_catalog_item(session, payload.item_name, payload.item_price)
        invoice_number = next_invoice_number(session, payload.entry_date)

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
        invoice_number=invoice_number,
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


def update_entry(
    session: Session,
    entry_id: int,
    payload: AccountingEntryCreate,
) -> Optional[AccountingEntry]:
    entry = get_entry(session, entry_id)
    if entry is None:
        return None

    customer_id: Optional[int] = None
    customer_name = payload.customer_name or "-"
    phone = payload.phone or ""

    if payload.entry_type == EntryType.CREDIT:
        if phone:
            customer = upsert_customer(session, customer_name, phone)
            customer_id = customer.id
        upsert_catalog_item(session, payload.item_name, payload.item_price)
        if not entry.invoice_number:
            entry.invoice_number = next_invoice_number(session, payload.entry_date)
    else:
        entry.invoice_number = None

    entry.entry_type = payload.entry_type
    entry.entry_date = payload.entry_date
    entry.customer_id = customer_id
    entry.customer_name = customer_name
    entry.phone = phone
    entry.item_name = payload.item_name
    entry.item_price = payload.item_price
    entry.quantity = payload.quantity
    entry.total = round(payload.item_price * payload.quantity, 2)
    entry.is_paid = payload.is_paid
    entry.payment_method = payload.payment_method
    entry.notes = payload.notes

    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def _apply_filters(
    statement,
    *,
    entry_type: Optional[EntryType] = None,
    is_paid: Optional[bool] = None,
    payment_method: Optional[PaymentMethod] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    phone: Optional[str] = None,
    name: Optional[str] = None,
):
    if entry_type is not None:
        statement = statement.where(AccountingEntry.entry_type == entry_type)
    if is_paid is not None:
        statement = statement.where(AccountingEntry.is_paid == is_paid)
    if payment_method is not None:
        statement = statement.where(AccountingEntry.payment_method == payment_method)
    if date_from is not None:
        statement = statement.where(AccountingEntry.entry_date >= date_from)
    if date_to is not None:
        statement = statement.where(AccountingEntry.entry_date <= date_to)
    if phone:
        digits = "".join(ch for ch in phone if ch.isdigit())
        statement = statement.where(AccountingEntry.phone == digits)
    if name:
        cleaned = name.strip()
        if cleaned:
            statement = statement.where(
                col(AccountingEntry.customer_name).ilike(f"%{cleaned}%")
            )
    return statement


def list_entries(
    session: Session,
    *,
    entry_type: Optional[EntryType] = None,
    is_paid: Optional[bool] = None,
    payment_method: Optional[PaymentMethod] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    phone: Optional[str] = None,
    name: Optional[str] = None,
    sort_order: str = "desc",
    limit: int = 100,
    offset: int = 0,
) -> list[AccountingEntry]:
    statement = select(AccountingEntry)
    statement = _apply_filters(
        statement,
        entry_type=entry_type,
        is_paid=is_paid,
        payment_method=payment_method,
        date_from=date_from,
        date_to=date_to,
        phone=phone,
        name=name,
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
    payment_method: Optional[PaymentMethod] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    name: Optional[str] = None,
) -> AccountingSummary:
    statement = select(AccountingEntry)
    statement = _apply_filters(
        statement,
        entry_type=entry_type,
        is_paid=is_paid,
        payment_method=payment_method,
        date_from=date_from,
        date_to=date_to,
        name=name,
    )
    entries = list(session.exec(statement).all())

    # Debit total can come from the filtered set.
    debit_total = sum(
        e.total for e in entries if e.entry_type == EntryType.DEBIT
    )

    # Purchased / received / outstanding are ALWAYS credit-only.
    # Re-query credits with the same filters (except entry_type) so All-tab
    # paid debit spend never leaks into total received / outstanding.
    credit_statement = select(AccountingEntry)
    credit_statement = _apply_filters(
        credit_statement,
        entry_type=EntryType.CREDIT,
        is_paid=is_paid,
        payment_method=payment_method,
        date_from=date_from,
        date_to=date_to,
        name=name,
    )
    # If the caller already scoped to debit only, credit tiles are zero.
    if entry_type == EntryType.DEBIT:
        credit_entries: list[AccountingEntry] = []
    else:
        credit_entries = list(session.exec(credit_statement).all())

    credit_total = sum(e.total for e in credit_entries)
    paid_total = sum(e.total for e in credit_entries if e.is_paid)
    unpaid_total = sum(e.total for e in credit_entries if not e.is_paid)

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
    payment_method: Optional[PaymentMethod] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    name: Optional[str] = None,
    sort_order: str = "desc",
) -> bytes:
    entries = list_entries(
        session,
        entry_type=entry_type,
        is_paid=is_paid,
        payment_method=payment_method,
        date_from=date_from,
        date_to=date_to,
        name=name,
        sort_order=sort_order,
        limit=10_000,
        offset=0,
    )

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Accounting Report"

    headers = [
        "Invoice",
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
                entry.invoice_number or "",
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
        name=name,
    )
    sheet.append([])
    sheet.append(["Summary"])
    sheet.append(["Total Purchased", summary.credit_total])
    sheet.append(["Total Received", summary.paid_total])
    sheet.append(["Total Outstanding", summary.unpaid_total])
    sheet.append(["Debit Total", summary.debit_total])
    sheet.append(["Entry Count", summary.entry_count])

    widths = [12, 12, 10, 22, 14, 24, 10, 10, 12, 8, 22, 30]
    for index, width in enumerate(widths, start=1):
        sheet.column_dimensions[chr(64 + index)].width = width

    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
