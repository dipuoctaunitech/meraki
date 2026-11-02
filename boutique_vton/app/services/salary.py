"""Business logic for salary records and advances."""

from datetime import date, datetime, timezone
from io import BytesIO
from typing import Optional

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font
from sqlmodel import Session, col, select

from app.models.accounting import SalaryAdvance, SalaryRecord
from app.schemas.salary import SalaryRecordCreate, SalaryRecordRead


def _to_read(record: SalaryRecord, advances: list[SalaryAdvance]) -> SalaryRecordRead:
    advance_total = round(sum(item.amount for item in advances), 2)
    balance = round(record.fixed_salary + record.miscellaneous - advance_total, 2)
    return SalaryRecordRead(
        id=record.id or 0,
        name=record.name,
        fixed_salary=record.fixed_salary,
        miscellaneous=record.miscellaneous,
        advances=advances,
        advance_total=advance_total,
        balance=balance,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _load_advances(session: Session, salary_id: int) -> list[SalaryAdvance]:
    return list(
        session.exec(
            select(SalaryAdvance)
            .where(SalaryAdvance.salary_id == salary_id)
            .order_by(col(SalaryAdvance.advance_date).asc())
        ).all()
    )


def search_salary_names(
    session: Session,
    *,
    query: str,
    limit: int = 8,
) -> list[str]:
    cleaned = query.strip()
    if len(cleaned) < 1:
        return []
    names = list(
        session.exec(
            select(SalaryRecord.name)
            .where(col(SalaryRecord.name).ilike(f"%{cleaned}%"))
            .distinct()
            .order_by(col(SalaryRecord.name).asc())
            .limit(limit * 2)
        ).all()
    )
    seen: set[str] = set()
    results: list[str] = []
    for name in names:
        key = name.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        results.append(name.strip())
        if len(results) >= limit:
            break
    return results


def list_salaries(
    session: Session,
    *,
    name: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort_order: str = "asc",
) -> list[SalaryRecordRead]:
    statement = select(SalaryRecord)
    cleaned = (name or "").strip()
    if cleaned:
        statement = statement.where(col(SalaryRecord.name).ilike(f"%{cleaned}%"))

    ascending = sort_order != "desc"
    name_order = (
        col(SalaryRecord.name).asc() if ascending else col(SalaryRecord.name).desc()
    )
    records = list(session.exec(statement.order_by(name_order)).all())

    result: list[SalaryRecordRead] = []
    for record in records:
        advances = _load_advances(session, record.id or 0)
        if date_from or date_to:
            filtered = []
            for advance in advances:
                if date_from and advance.advance_date < date_from:
                    continue
                if date_to and advance.advance_date > date_to:
                    continue
                filtered.append(advance)
            # Keep salary if it has matching advances, or no advances and no date filter match needed when name-only
            # When date filter is set: show record if any advance in range OR (no advances and created date in range)
            if advances:
                if not filtered:
                    continue
                advances = filtered
            else:
                created_day = record.created_at.date()
                if date_from and created_day < date_from:
                    continue
                if date_to and created_day > date_to:
                    continue
        result.append(_to_read(record, advances))
    return result


def get_salary(session: Session, salary_id: int) -> Optional[SalaryRecordRead]:
    record = session.get(SalaryRecord, salary_id)
    if record is None:
        return None
    return _to_read(record, _load_advances(session, salary_id))


def create_salary(session: Session, payload: SalaryRecordCreate) -> SalaryRecordRead:
    record = SalaryRecord(
        name=payload.name,
        fixed_salary=payload.fixed_salary,
        miscellaneous=payload.miscellaneous,
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    advances: list[SalaryAdvance] = []
    for item in payload.advances:
        if item.amount <= 0:
            continue
        advance = SalaryAdvance(
            salary_id=record.id or 0,
            amount=item.amount,
            advance_date=item.advance_date,
        )
        session.add(advance)
        advances.append(advance)
    session.commit()
    for advance in advances:
        session.refresh(advance)
    session.refresh(record)
    return _to_read(record, advances)


def update_salary(
    session: Session,
    salary_id: int,
    payload: SalaryRecordCreate,
) -> Optional[SalaryRecordRead]:
    record = session.get(SalaryRecord, salary_id)
    if record is None:
        return None

    record.name = payload.name
    record.fixed_salary = payload.fixed_salary
    record.miscellaneous = payload.miscellaneous
    record.updated_at = datetime.now(timezone.utc)
    session.add(record)

    existing = list(
        session.exec(
            select(SalaryAdvance).where(SalaryAdvance.salary_id == salary_id)
        ).all()
    )
    for advance in existing:
        session.delete(advance)

    advances: list[SalaryAdvance] = []
    for item in payload.advances:
        if item.amount <= 0:
            continue
        advance = SalaryAdvance(
            salary_id=salary_id,
            amount=item.amount,
            advance_date=item.advance_date,
        )
        session.add(advance)
        advances.append(advance)

    session.commit()
    for advance in advances:
        session.refresh(advance)
    session.refresh(record)
    return _to_read(record, advances)


def delete_salary(session: Session, salary_id: int) -> bool:
    record = session.get(SalaryRecord, salary_id)
    if record is None:
        return False
    advances = list(
        session.exec(
            select(SalaryAdvance).where(SalaryAdvance.salary_id == salary_id)
        ).all()
    )
    for advance in advances:
        session.delete(advance)
    session.delete(record)
    session.commit()
    return True


def build_excel_report(
    session: Session,
    *,
    name: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort_order: str = "asc",
) -> bytes:
    records = list_salaries(
        session,
        name=name,
        date_from=date_from,
        date_to=date_to,
        sort_order=sort_order,
    )

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Salary Report"

    headers = [
        "Name",
        "Fixed Salary",
        "Miscellaneous",
        "Advance",
        "Date of Advance",
        "Advance Total",
        "Balance",
    ]
    sheet.append(headers)
    for cell in sheet[1]:
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal="center")

    for record in records:
        if not record.advances:
            sheet.append(
                [
                    record.name,
                    record.fixed_salary,
                    record.miscellaneous,
                    "",
                    "",
                    record.advance_total,
                    record.balance,
                ]
            )
            continue
        for index, advance in enumerate(record.advances):
            sheet.append(
                [
                    record.name if index == 0 else "",
                    record.fixed_salary if index == 0 else "",
                    record.miscellaneous if index == 0 else "",
                    advance.amount,
                    advance.advance_date.isoformat(),
                    record.advance_total if index == 0 else "",
                    record.balance if index == 0 else "",
                ]
            )

    widths = [22, 14, 14, 12, 16, 14, 12]
    for index, width in enumerate(widths, start=1):
        sheet.column_dimensions[chr(64 + index)].width = width

    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
