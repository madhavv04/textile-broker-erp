from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt as pyjwt
import hashlib
import os

from .config import settings
from .database import get_db
from . import models

# Use settings for all auth config
SECRET_KEY = settings.jwt_secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# ---------------------------------------------------------------------------
# Password hashing — bcrypt via passlib (industry standard)
# Backward-compatible: detects old PBKDF2 hashes and re-hashes on login.
# ---------------------------------------------------------------------------

try:
    from passlib.context import CryptContext
    _pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _BCRYPT_AVAILABLE = True
except ImportError:
    _BCRYPT_AVAILABLE = False


def _pbkdf2_verify(plain_password: str, hashed_password: str) -> bool:
    """Verify a legacy PBKDF2 hash (salt$hexdigest format)."""
    try:
        salt, key_hex = hashed_password.split("$", 1)
        key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            100000,
        )
        return key.hex() == key_hex
    except Exception:
        return False


def _pbkdf2_hash(password: str) -> str:
    """Create a legacy PBKDF2 hash (only used when bcrypt unavailable)."""
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000,
    )
    return f"{salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password — supports bcrypt (new) and PBKDF2 (legacy)."""
    if _BCRYPT_AVAILABLE:
        # New bcrypt hash starts with '$2b$'
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            return _pwd_ctx.verify(plain_password, hashed_password)
        # Legacy PBKDF2 — verify then caller should re-hash
        return _pbkdf2_verify(plain_password, hashed_password)
    return _pbkdf2_verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password — uses bcrypt if available, falls back to PBKDF2."""
    if _BCRYPT_AVAILABLE:
        return _pwd_ctx.hash(password)
    return _pbkdf2_hash(password)


def is_legacy_hash(hashed_password: str) -> bool:
    """Return True if the stored hash is a legacy PBKDF2 hash."""
    return not (hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"))


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return pyjwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


DEFAULT_USERNAME = "default"


def get_current_user(db: Session = Depends(get_db)):
    """Auth removed — always returns a single default user, auto-created."""
    user = db.query(models.User).filter(models.User.username == DEFAULT_USERNAME).first()
    if user is None:
        user = models.User(
            username=DEFAULT_USERNAME,
            full_name="Default User",
            hashed_password=get_password_hash("unused-" + os.urandom(8).hex()),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
