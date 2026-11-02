"""Pydantic schemas for salary records."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SalaryAdvanceInput(BaseModel):
    amount: float = Field(ge=0)
    advance_date: date


class SalaryAdvanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: float
    advance_date: date
    created_at: datetime


class SalaryRecordCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    fixed_salary: float = Field(ge=0)
    miscellaneous: float = Field(default=0, ge=0)
    advances: list[SalaryAdvanceInput] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name cannot be empty")
        return cleaned

    @model_validator(mode="after")
    def validate_advances(self) -> "SalaryRecordCreate":
        for advance in self.advances:
            if advance.amount < 0:
                raise ValueError("Advance amount cannot be negative")
        return self


class SalaryRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    fixed_salary: float
    miscellaneous: float
    advances: list[SalaryAdvanceRead]
    advance_total: float
    balance: float
    created_at: datetime
    updated_at: datetime
