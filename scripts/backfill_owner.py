"""
One-time backfill: assigns any pre-existing Party/Order/Payment rows that
predate the owner_user_id column to a designated admin user.

Only needed if you're upgrading an OLD database that was created before the
multi-tenancy fix (i.e. it has rows with owner_user_id = NULL after the
migration runs, if the column was added as nullable first). On a fresh
install this script has nothing to do.

Usage:
    DEFAULT_ADMIN_USERNAME=admin python scripts/backfill_owner.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app import models


def main():
    admin_username = os.environ.get("DEFAULT_ADMIN_USERNAME", "admin")
    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == admin_username).first()
        if not admin:
            print(f"No user named '{admin_username}' found. Create one first, or set "
                  f"DEFAULT_ADMIN_USERNAME to an existing username.")
            return 1

        updated = 0
        for model in (models.Party, models.Order, models.Payment):
            rows = db.query(model).filter(model.owner_user_id.is_(None)).all()
            for row in rows:
                row.owner_user_id = admin.id
                updated += 1
        db.commit()
        print(f"Backfilled owner_user_id on {updated} row(s) to user '{admin_username}' (id={admin.id}).")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
