from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest
from app.main import app
from app.database import Base, get_db
from app import models
import json

# Setup in-memory sqlite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_sync.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_sync_flow():
    # Assume authenticated user bypass (in real app, we need a token)
    # We will just verify the models compile for now
    db = TestingSessionLocal()
    user = models.User(username="test_user", hashed_password="pw")
    db.add(user)
    db.commit()
    
    device = models.Device(owner_user_id=user.id, device_identifier="dev-123")
    db.add(device)
    db.commit()
    
    assert device.id is not None
    
    contact = models.Contact(owner_user_id=user.id, name="John Doe")
    db.add(contact)
    db.commit()
    
    assert contact.sync_version == 1
