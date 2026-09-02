"""
Creates two demo users (alice, bob) for manually verifying the multi-tenant
data isolation fix. Safe to re-run — skips users that already exist.

Usage:
    python scripts/seed_demo_users.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal, engine, Base
from app import models, crud, schemas


DEMO_USERS = [
    {"username": "alice", "password": "Alice@1234", "full_name": "Alice Shah", "mobile": "9000000001"},
    {"username": "bob", "password": "Bob@12345", "full_name": "Bob Mehta", "mobile": "9000000002"},
]


def main():
    Base.metadata.create_all(bind=engine)  # no-op if alembic already ran
    db = SessionLocal()
    try:
        for u in DEMO_USERS:
            existing = crud.get_user_by_username(db, u["username"])
            if existing:
                print(f"User '{u['username']}' already exists — skipping.")
                continue
            crud.create_user(db, schemas.UserCreate(**u))
            print(f"Created user '{u['username']}' (password: {u['password']}).")
        print("\nDone. Log in as alice, add a party/order, log out, log in as bob, "
              "and confirm bob sees none of alice's data.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
