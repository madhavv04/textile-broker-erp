import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Force test env/config BEFORE importing the app
os.environ["ENV"] = "dev"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-not-for-prod"
os.environ["DATABASE_URL"] = "sqlite:///./test_textile_broker.db"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app import models  # noqa: F401 registers models


TEST_DB_URL = "sqlite:///./test_textile_broker.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function", autouse=True)
def _fresh_db():
    """Recreate all tables before every test for full isolation between tests."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Reset the in-memory rate limiter too, so tests don't trip each other's
    # login/OTP rate limits when run together in one process.
    from app.middleware import rate_limiter
    rate_limiter._hits.clear()
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c


def register_and_login(client, username="alice", password="Alice@1234", mobile="9000000001"):
    """Helper: registers a user directly (no OTP) and returns an auth header dict."""
    resp = client.post("/api/auth/register", json={
        "username": username,
        "password": password,
        "full_name": username.title(),
        "mobile": mobile,
    })
    assert resp.status_code == 201, resp.text
    token_resp = client.post("/api/auth/token", data={"username": username, "password": password})
    assert token_resp.status_code == 200, token_resp.text
    token = token_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
