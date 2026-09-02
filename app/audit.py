"""
Lightweight audit log for create/update/delete actions — useful for
compliance and dispute resolution in a brokerage context.
"""
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import Session
from .database import Base, engine


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    action = Column(String, nullable=False)          # "create" | "update" | "delete"
    entity_type = Column(String, nullable=False)      # "party" | "order" | "payment"
    entity_id = Column(Integer, nullable=False)
    before_json = Column(Text, nullable=True)
    after_json = Column(Text, nullable=True)
    ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


def ensure_table():
    AuditLog.__table__.create(bind=engine, checkfirst=True)


def _to_json(obj) -> str | None:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return json.dumps(obj, default=str)
    # SQLAlchemy model instance — dump its columns
    data = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    return json.dumps(data, default=str)


def log_action(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    before=None,
    after=None,
    ip: str | None = None,
    user_agent: str | None = None,
):
    ensure_table()
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_json=_to_json(before),
        after_json=_to_json(after),
        ip=ip,
        user_agent=user_agent,
    )
    db.add(entry)
    db.commit()
