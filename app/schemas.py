from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
import re
from datetime import datetime

# ---------------------------------------------------------------------------
# User schemas
# ---------------------------------------------------------------------------

def _validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", v):
        raise ValueError("Password must contain at least one special character")
    return v


def _validate_date(v: Optional[str]) -> Optional[str]:
    if v is not None:
        try:
            from datetime import datetime
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format")
    return v


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    mobile: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password(v)


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    google_id: Optional[str] = None  # present when account is linked to Google OAuth

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# ---------------------------------------------------------------------------
# Party schemas
# ---------------------------------------------------------------------------

class PartyBase(BaseModel):
    name: str
    mobile: Optional[str] = None
    terms: Optional[int] = None
    address: Optional[str] = None
    weaver_name: Optional[str] = None
    gst_number: Optional[str] = None
    quality_name: Optional[str] = None


class PartyCreate(PartyBase):
    pass


class PartyUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    terms: Optional[int] = None
    address: Optional[str] = None
    weaver_name: Optional[str] = None
    gst_number: Optional[str] = None
    quality_name: Optional[str] = None


class PartyResponse(PartyBase):
    id: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Order schemas
# ---------------------------------------------------------------------------

class OrderBase(BaseModel):
    no: Optional[str] = None
    date: Optional[str] = None
    weaver: Optional[str] = None
    quality: Optional[str] = None
    lot: Optional[str] = None
    taka: Optional[str] = None
    qty: float
    rate: float
    b_percent: Optional[float] = 1.0
    terms: Optional[int] = None
    remarks: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        return _validate_date(v)


class OrderCreate(OrderBase):
    party_name: str  # User enters party name; backend resolves/creates


class OrderUpdate(BaseModel):
    no: Optional[str] = None
    date: Optional[str] = None
    party_name: Optional[str] = None
    weaver: Optional[str] = None
    quality: Optional[str] = None
    lot: Optional[str] = None
    taka: Optional[str] = None
    qty: Optional[float] = None
    rate: Optional[float] = None
    b_percent: Optional[float] = None
    terms: Optional[int] = None
    remarks: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        return _validate_date(v)


class OrderResponse(BaseModel):
    id: int
    no: str
    date: str
    party_id: int
    party_name: str
    weaver: Optional[str] = None
    quality: Optional[str] = None
    lot: Optional[str] = None
    taka: Optional[str] = None
    qty: float
    rate: float
    value: float
    b_percent: float
    b_value: float
    terms: Optional[int] = None
    remarks: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Payment schemas
# ---------------------------------------------------------------------------

class PaymentCreate(BaseModel):
    party_name: str
    amount: float
    date: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        return _validate_date(v)


class PaymentUpdate(BaseModel):
    party_name: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        return _validate_date(v)


class PaymentResponse(BaseModel):
    id: int
    party_id: int
    party_name: str
    amount: float
    date: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Aggregation schemas
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    order_count: int
    total_meters: float
    total_brokerage: float
    outstanding: float


class BrokerageRow(BaseModel):
    party_name: str
    order_value: float
    brokerage: float

# ---------------------------------------------------------------------------
# Device schemas
# ---------------------------------------------------------------------------

class DeviceCreate(BaseModel):
    device_identifier: str
    platform: Optional[str] = None

class DeviceResponse(BaseModel):
    id: int
    device_identifier: str
    platform: Optional[str] = None
    last_sync_version: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

# ---------------------------------------------------------------------------
# Contact schemas
# ---------------------------------------------------------------------------

class ContactBase(BaseModel):
    device_contact_id: Optional[str] = None
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_numbers: Optional[List[Dict[str, Any]]] = None
    emails: Optional[List[Dict[str, Any]]] = None
    organization: Optional[str] = None
    job_title: Optional[str] = None
    addresses: Optional[List[Dict[str, Any]]] = None
    birthday: Optional[str] = None
    created_by_device_id: Optional[str] = None
    updated_by_device_id: Optional[str] = None

class ContactCreate(ContactBase):
    pass

class ContactUpdate(ContactBase):
    deleted_at: Optional[datetime] = None

class ContactResponse(ContactBase):
    id: int
    sync_version: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class ContactSyncChange(ContactBase):
    id: Optional[int] = None
    deleted_at: Optional[datetime] = None

class ContactSyncRequest(BaseModel):
    last_sync_version: int
    device_identifier: str
    changes: List[ContactSyncChange]

class ContactSyncResponse(BaseModel):
    server_version: int
    changes: List[ContactResponse]