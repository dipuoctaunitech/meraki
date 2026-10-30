"""Accounting models for customers and ledger entries."""

from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import Column, String, UniqueConstraint
from sqlmodel import Field, SQLModel


class EntryType(str, Enum):
    CREDIT = "credit"
    DEBIT = "debit"


class PaymentMethod(str, Enum):
    CASH = "cash"
    GPAY = "gpay"
    BANK_HDFC = "bank_hdfc"
    BANK_ICICI = "bank_icici"


class Customer(SQLModel, table=True):
    """Customer identified by a unique phone number."""

    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint("phone", name="uq_customers_phone"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(120), nullable=False))
    phone: str = Field(sa_column=Column(String(20), nullable=False, index=True))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class CatalogItem(SQLModel, table=True):
    """Saved sale item names with last known unit price."""

    __tablename__ = "catalog_items"
    __table_args__ = (UniqueConstraint("name_key", name="uq_catalog_items_name_key"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(200), nullable=False))
    name_key: str = Field(sa_column=Column(String(200), nullable=False, index=True))
    price: float = Field(nullable=False, ge=0)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class AccountingEntry(SQLModel, table=True):
    """A credit (sale) or debit (expense) ledger entry."""

    __tablename__ = "accounting_entries"

    id: Optional[int] = Field(default=None, primary_key=True)
    entry_type: EntryType = Field(nullable=False, index=True)
    entry_date: date = Field(nullable=False, index=True)
    customer_id: Optional[int] = Field(default=None, foreign_key="customers.id", index=True)
    customer_name: str = Field(sa_column=Column(String(120), nullable=False))
    phone: str = Field(sa_column=Column(String(20), nullable=False, index=True))
    item_name: str = Field(sa_column=Column(String(200), nullable=False))
    item_price: float = Field(nullable=False, ge=0)
    quantity: int = Field(nullable=False, ge=1)
    total: float = Field(nullable=False, ge=0)
    is_paid: bool = Field(default=False, nullable=False, index=True)
    payment_method: Optional[PaymentMethod] = Field(default=None)
    notes: Optional[str] = Field(default=None, sa_column=Column(String(500), nullable=True))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
