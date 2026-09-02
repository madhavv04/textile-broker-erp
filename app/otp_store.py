"""
Persistent, hashed OTP storage.

Uses a small SQLAlchemy table so OTPs survive process restarts and work
correctly with multiple workers (unlike the old in-memory dict). If REDIS_URL
is configured, swap this for a Redis-backed implementation with the same
interface (`store`, `verify`, `clear`) — the OTP hash + expiry + attempts
model stays identical.
"""
import hashlib
import os
import time
from sqlalchemy import Column, Integer, String, Float
from .database import Base, engine, SessionLocal


class OTPRecord(Base):
    __tablename__ = "otp_records"

    id = Column(Integer, primary_key=True, index=True)
    mobile = Column(String, unique=True, index=True, nullable=False)
    otp_hash = Column(String, nullable=False)
    expires_at = Column(Float, nullable=False)
    attempts = Column(Integer, default=0)


def _hash_otp(mobile: str, otp: str) -> str:
    return hashlib.sha256(f"{mobile}:{otp}".encode("utf-8")).hexdigest()


def ensure_table():
    OTPRecord.__table__.create(bind=engine, checkfirst=True)


def store_otp(mobile: str, otp: str, ttl_seconds: int = 300) -> None:
    ensure_table()
    db = SessionLocal()
    try:
        db.query(OTPRecord).filter(OTPRecord.mobile == mobile).delete()
        rec = OTPRecord(
            mobile=mobile,
            otp_hash=_hash_otp(mobile, otp),
            expires_at=time.time() + ttl_seconds,
            attempts=0,
        )
        db.add(rec)
        db.commit()
    finally:
        db.close()


def verify_otp(mobile: str, otp: str, max_attempts: int = 3) -> tuple[bool, str]:
    """Returns (success, error_message). Deletes the record on success or exhaustion."""
    ensure_table()
    db = SessionLocal()
    try:
        rec = db.query(OTPRecord).filter(OTPRecord.mobile == mobile).first()
        if not rec:
            return False, "No OTP found for this mobile. Please request a new OTP."
        if time.time() > rec.expires_at:
            db.delete(rec)
            db.commit()
            return False, "OTP has expired. Please request a new one."
        rec.attempts += 1
        if rec.attempts > max_attempts:
            db.delete(rec)
            db.commit()
            return False, "Too many OTP attempts. Please request a new OTP."
        if rec.otp_hash != _hash_otp(mobile, otp.strip()):
            db.commit()
            return False, "Invalid OTP. Please check and try again."
        db.delete(rec)
        db.commit()
        return True, ""
    finally:
        db.close()


def clear_otp(mobile: str) -> None:
    ensure_table()
    db = SessionLocal()
    try:
        db.query(OTPRecord).filter(OTPRecord.mobile == mobile).delete()
        db.commit()
    finally:
        db.close()
