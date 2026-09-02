from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from .database import Base


class Party(Base):
    __tablename__ = "parties"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, index=True, nullable=False)       # NOT globally unique — per-user
    mobile = Column(String, nullable=True)
    terms = Column(Integer, nullable=True)                  # Payment terms in days
    address = Column(String, nullable=True)
    weaver_name = Column(String, nullable=True)
    gst_number = Column(String, nullable=True)
    quality_name = Column(String, nullable=True)

    owner = relationship("User", backref="parties")
    orders = relationship("Order", back_populates="party", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="party", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("owner_user_id", "name", name="uq_party_user_name"),
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    no = Column(String, index=True, nullable=False)         # NOT globally unique — per-user
    date = Column(String, nullable=False)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    weaver = Column(String, nullable=True)
    quality = Column(String, nullable=True)
    lot = Column(String, nullable=True)
    taka = Column(String, nullable=True)
    qty = Column(Float, nullable=False)
    rate = Column(Float, nullable=False)
    value = Column(Float, nullable=False)                   # qty * rate
    b_percent = Column(Float, default=1.0)
    b_value = Column(Float, nullable=False)                 # value * b_percent / 100
    terms = Column(Integer, nullable=True)
    remarks = Column(String, nullable=True)

    party = relationship("Party", back_populates="orders")
    owner = relationship("User", backref="orders")

    __table_args__ = (
        UniqueConstraint("owner_user_id", "no", name="uq_order_user_no"),
    )


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(String, nullable=False)

    party = relationship("Party", back_populates="payments")
    owner = relationship("User", backref="payments")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    mobile = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    
    # Google OAuth fields
    google_id = Column(String, unique=True, index=True, nullable=True)
    google_email = Column(String, nullable=True)
    google_access_token = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)
    google_token_expiry = Column(DateTime, nullable=True)

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    device_identifier = Column(String, index=True, nullable=False)
    platform = Column(String, nullable=True)
    last_sync_version = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=True)

    owner = relationship("User", backref="devices")

    __table_args__ = (
        UniqueConstraint("owner_user_id", "device_identifier", name="uq_device_user_identifier"),
    )

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    device_contact_id = Column(String, nullable=True, index=True)  # ID from phone
    name = Column(String, index=True, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone_numbers = Column(JSON, nullable=True)
    emails = Column(JSON, nullable=True)
    organization = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    addresses = Column(JSON, nullable=True)
    birthday = Column(String, nullable=True)
    
    sync_version = Column(Integer, nullable=False, default=1, index=True)
    
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True, index=True)
    
    created_by_device_id = Column(String, nullable=True)
    updated_by_device_id = Column(String, nullable=True)

    owner = relationship("User", backref="contacts")