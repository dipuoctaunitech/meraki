"""Pydantic schemas for accounting API."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.accounting import EntryType, PaymentMethod


def _normalize_phone(value: str) -> str:
    digits = "".join(ch for ch in value.strip() if ch.isdigit())
    if len(digits) < 10 or len(digits) > 15:
        raise ValueError("Phone number must contain 10 to 15 digits")
    return digits


class AccountingEntryCreate(BaseModel):
    entry_type: EntryType = EntryType.CREDIT
    entry_date: date
    customer_name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = None
    item_name: str = Field(min_length=1, max_length=200)
    item_price: float = Field(ge=0)
    quantity: int = Field(default=1, ge=1)
    is_paid: bool = False
    payment_method: Optional[PaymentMethod] = None
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("item_name")
    @classmethod
    def strip_item_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Value cannot be empty")
        return cleaned

    @field_validator("customer_name")
    @classmethod
    def strip_customer_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @model_validator(mode="after")
    def validate_by_entry_type(self) -> "AccountingEntryCreate":
        if self.is_paid and self.payment_method is None:
            raise ValueError("payment_method is required when is_paid is true")
        if not self.is_paid and self.payment_method is not None:
            raise ValueError("payment_method must be empty when is_paid is false")

        if self.entry_type == EntryType.CREDIT:
            if not self.customer_name:
                raise ValueError("customer_name is required for credit entries")
            if not self.phone:
                raise ValueError("phone is required for credit entries")
            self.phone = _normalize_phone(self.phone)
        else:
            # Debit/expense: no customer phone; quantity is always 1
            self.phone = ""
            self.quantity = 1
            if not self.customer_name:
                self.customer_name = "-"

        return self


class AccountingEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entry_type: EntryType
    entry_date: date
    customer_id: Optional[int]
    customer_name: str
    phone: str
    item_name: str
    item_price: float
    quantity: int
    total: float
    is_paid: bool
    payment_method: Optional[PaymentMethod]
    notes: Optional[str]
    created_at: datetime


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str


class CatalogItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: float


class AccountingSummary(BaseModel):
    credit_total: float
    debit_total: float
    paid_total: float
    unpaid_total: float
    entry_count: int
