from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import random
from . import models, schemas

# ---------------------------------------------------------------------------
# Party operations
# ---------------------------------------------------------------------------

def get_party_by_name(db: Session, name: str, user_id: int):
    return db.query(models.Party).filter(
        models.Party.name == name,
        models.Party.owner_user_id == user_id,
    ).first()


def get_or_create_party(db: Session, name: str, user_id: int):
    """Get existing party (scoped to user) or create it. Handles race-condition IntegrityError."""
    party = get_party_by_name(db, name, user_id)
    if not party:
        try:
            party = models.Party(name=name, owner_user_id=user_id)
            db.add(party)
            db.commit()
            db.refresh(party)
        except IntegrityError:
            db.rollback()
            # Race condition: another request created it — fetch it
            party = get_party_by_name(db, name, user_id)
    return party


def create_party(db: Session, party: schemas.PartyCreate, user_id: int):
    db_party = models.Party(
        name=party.name,
        mobile=party.mobile,
        terms=party.terms,
        address=party.address,
        weaver_name=party.weaver_name,
        gst_number=party.gst_number,
        quality_name=party.quality_name,
        owner_user_id=user_id,
    )
    db.add(db_party)
    db.commit()
    db.refresh(db_party)
    return db_party


def get_parties(db: Session, user_id: int):
    return db.query(models.Party).filter(models.Party.owner_user_id == user_id).all()


def get_party_for_user(db: Session, party_id: int, user_id: int):
    """Return the party ONLY if it belongs to user_id — returns None (caller raises 404)."""
    return db.query(models.Party).filter(
        models.Party.id == party_id,
        models.Party.owner_user_id == user_id,
    ).first()


def update_party(db: Session, party_id: int, party_in: schemas.PartyUpdate, user_id: int):
    db_party = get_party_for_user(db, party_id, user_id)
    if not db_party:
        return None
    # Prevent duplicate name collision within same user
    if party_in.name is not None and party_in.name != db_party.name:
        existing = get_party_by_name(db, party_in.name, user_id)
        if existing and existing.id != db_party.id:
            raise ValueError("You already have a party with this name")
    for field in ["name", "mobile", "terms", "address", "weaver_name", "gst_number", "quality_name"]:
        val = getattr(party_in, field)
        if val is not None:
            setattr(db_party, field, val)
    db.commit()
    db.refresh(db_party)
    return db_party


def delete_party(db: Session, party_id: int, user_id: int):
    party = get_party_for_user(db, party_id, user_id)
    if not party:
        return False
    db.delete(party)  # cascade="all, delete-orphan" handles orders + payments
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Order operations
# ---------------------------------------------------------------------------

def _generate_order_no(user_id: int) -> str:
    """Generate a collision-resistant order number."""
    ts = int(datetime.utcnow().timestamp() * 1000)
    rand = random.randint(1000, 9999)
    return f"ORD-{user_id}-{ts}-{rand}"


def create_order(db: Session, order: schemas.OrderCreate, user_id: int):
    party = get_or_create_party(db, order.party_name, user_id)
    qty, rate = order.qty, order.rate
    value = qty * rate
    b_percent = order.b_percent if order.b_percent is not None else 1.0
    b_value = value * b_percent / 100.0
    order_no = order.no if order.no else _generate_order_no(user_id)
    order_date = order.date if order.date else datetime.utcnow().strftime("%Y-%m-%d")

    db_order = models.Order(
        no=order_no,
        date=order_date,
        party_id=party.id,
        weaver=order.weaver,
        quality=order.quality,
        lot=order.lot,
        taka=order.taka,
        qty=qty,
        rate=rate,
        value=value,
        b_percent=b_percent,
        b_value=b_value,
        terms=order.terms if order.terms is not None else party.terms,
        remarks=order.remarks,
        owner_user_id=user_id,
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


def get_orders(
    db: Session, user_id: int, limit: int = 10000, offset: int = 0,
    search: str | None = None, party_id: int | None = None,
    from_date: str | None = None, to_date: str | None = None,
):
    q = db.query(models.Order).filter(models.Order.owner_user_id == user_id)
    if search:
        like = f"%{search}%"
        q = q.join(models.Party).filter(
            (models.Order.no.ilike(like))
            | (models.Order.quality.ilike(like))
            | (models.Order.weaver.ilike(like))
            | (models.Party.name.ilike(like))
        )
    if party_id is not None:
        q = q.filter(models.Order.party_id == party_id)
    if from_date:
        q = q.filter(models.Order.date >= from_date)
    if to_date:
        q = q.filter(models.Order.date <= to_date)
    return q.order_by(models.Order.id.desc()).offset(offset).limit(limit).all()


def get_order_for_user(db: Session, order_id: int, user_id: int):
    return db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.owner_user_id == user_id,
    ).first()


def update_order(db: Session, order_id: int, order_in: schemas.OrderUpdate, user_id: int):
    db_order = get_order_for_user(db, order_id, user_id)
    if not db_order:
        return None
    if order_in.party_name is not None:
        party = get_or_create_party(db, order_in.party_name, user_id)
        db_order.party_id = party.id
    for field in ["no", "date", "weaver", "quality", "lot", "taka", "qty", "rate", "b_percent", "terms", "remarks"]:
        val = getattr(order_in, field)
        if val is not None:
            setattr(db_order, field, val)
    db_order.value = db_order.qty * db_order.rate
    db_order.b_value = db_order.value * db_order.b_percent / 100.0
    db.commit()
    db.refresh(db_order)
    return db_order


def delete_order(db: Session, order_id: int, user_id: int):
    o = get_order_for_user(db, order_id, user_id)
    if not o:
        return False
    db.delete(o)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Payment operations
# ---------------------------------------------------------------------------

def create_payment(db: Session, payment: schemas.PaymentCreate, user_id: int):
    party = get_or_create_party(db, payment.party_name, user_id)
    pay_date = payment.date if payment.date else datetime.utcnow().strftime("%Y-%m-%d")
    db_payment = models.Payment(
        party_id=party.id,
        amount=payment.amount,
        date=pay_date,
        owner_user_id=user_id,
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def get_payments(
    db: Session, user_id: int, limit: int = 10000, offset: int = 0,
    party_id: int | None = None, from_date: str | None = None, to_date: str | None = None,
):
    q = db.query(models.Payment).filter(models.Payment.owner_user_id == user_id)
    if party_id is not None:
        q = q.filter(models.Payment.party_id == party_id)
    if from_date:
        q = q.filter(models.Payment.date >= from_date)
    if to_date:
        q = q.filter(models.Payment.date <= to_date)
    return q.order_by(models.Payment.id.desc()).offset(offset).limit(limit).all()


def get_payment_for_user(db: Session, payment_id: int, user_id: int):
    return db.query(models.Payment).filter(
        models.Payment.id == payment_id,
        models.Payment.owner_user_id == user_id,
    ).first()


def update_payment(db: Session, payment_id: int, payment_in: schemas.PaymentUpdate, user_id: int):
    db_payment = get_payment_for_user(db, payment_id, user_id)
    if not db_payment:
        return None
    if payment_in.party_name is not None:
        party = get_or_create_party(db, payment_in.party_name, user_id)
        db_payment.party_id = party.id
    if payment_in.amount is not None:
        db_payment.amount = payment_in.amount
    if payment_in.date is not None:
        db_payment.date = payment_in.date
    db.commit()
    db.refresh(db_payment)
    return db_payment


def delete_payment(db: Session, payment_id: int, user_id: int):
    p = get_payment_for_user(db, payment_id, user_id)
    if not p:
        return False
    db.delete(p)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Aggregations — all scoped by user_id
# ---------------------------------------------------------------------------

def get_dashboard_stats(db: Session, user_id: int):
    order_count = db.query(func.count(models.Order.id)).filter(
        models.Order.owner_user_id == user_id
    ).scalar() or 0
    total_meters = db.query(func.sum(models.Order.qty)).filter(
        models.Order.owner_user_id == user_id
    ).scalar() or 0.0
    total_brokerage = db.query(func.sum(models.Order.b_value)).filter(
        models.Order.owner_user_id == user_id
    ).scalar() or 0.0
    total_order_value = db.query(func.sum(models.Order.value)).filter(
        models.Order.owner_user_id == user_id
    ).scalar() or 0.0
    total_payments = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.owner_user_id == user_id
    ).scalar() or 0.0
    outstanding = max(0.0, total_order_value - total_payments)
    return {
        "order_count": order_count,
        "total_meters": total_meters,
        "total_brokerage": total_brokerage,
        "outstanding": outstanding,
    }


def get_brokerage_summary(db: Session, user_id: int):
    # TODO: replace N+1 with a single GROUP BY query in v1.1
    parties = db.query(models.Party).filter(models.Party.owner_user_id == user_id).all()
    summary = []
    for party in parties:
        order_value = db.query(func.sum(models.Order.value)).filter(
            models.Order.party_id == party.id,
            models.Order.owner_user_id == user_id,
        ).scalar() or 0.0
        brokerage = db.query(func.sum(models.Order.b_value)).filter(
            models.Order.party_id == party.id,
            models.Order.owner_user_id == user_id,
        ).scalar() or 0.0
        if order_value > 0 or brokerage > 0:
            summary.append({
                "party_name": party.name,
                "order_value": order_value,
                "brokerage": brokerage,
            })
    return summary


# ---------------------------------------------------------------------------
# User operations
# ---------------------------------------------------------------------------

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_mobile(db: Session, mobile: str):
    return db.query(models.User).filter(models.User.mobile == mobile).first()


def create_user(db: Session, user: schemas.UserCreate):
    from .auth import get_password_hash
    db_user = models.User(
        username=user.username,
        full_name=user.full_name,
        mobile=user.mobile,
        hashed_password=get_password_hash(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ---------------------------------------------------------------------------
# Device operations
# ---------------------------------------------------------------------------

def get_device_by_identifier(db: Session, device_identifier: str, user_id: int):
    return db.query(models.Device).filter(
        models.Device.device_identifier == device_identifier,
        models.Device.owner_user_id == user_id,
    ).first()

def register_device(db: Session, device: schemas.DeviceCreate, user_id: int):
    db_device = get_device_by_identifier(db, device.device_identifier, user_id)
    if not db_device:
        db_device = models.Device(
            device_identifier=device.device_identifier,
            platform=device.platform,
            owner_user_id=user_id,
            created_at=datetime.utcnow()
        )
        db.add(db_device)
        db.commit()
        db.refresh(db_device)
    return db_device

# ---------------------------------------------------------------------------
# Contact operations (Sync Engine)
# ---------------------------------------------------------------------------

def sync_contacts(db: Session, sync_req: schemas.ContactSyncRequest, user_id: int):
    device = get_device_by_identifier(db, sync_req.device_identifier, user_id)
    if not device:
        raise ValueError("Device not registered")
    
    # 1. Process incoming changes from the device
    for change in sync_req.changes:
        if change.id:
            # Update existing contact
            db_contact = db.query(models.Contact).filter(
                models.Contact.id == change.id,
                models.Contact.owner_user_id == user_id
            ).first()
            
            if db_contact:
                # If deleted
                if change.deleted_at:
                    if not db_contact.deleted_at:
                        db_contact.deleted_at = change.deleted_at
                        db_contact.sync_version = models.Contact.sync_version + 1
                        db_contact.updated_at = datetime.utcnow()
                        db_contact.updated_by_device_id = sync_req.device_identifier
                else:
                    # Normal update - we use last write wins based on version or just increment
                    db_contact.device_contact_id = change.device_contact_id
                    db_contact.name = change.name
                    db_contact.first_name = change.first_name
                    db_contact.last_name = change.last_name
                    db_contact.phone_numbers = change.phone_numbers
                    db_contact.emails = change.emails
                    db_contact.organization = change.organization
                    db_contact.job_title = change.job_title
                    db_contact.addresses = change.addresses
                    db_contact.birthday = change.birthday
                    db_contact.sync_version = models.Contact.sync_version + 1
                    db_contact.updated_at = datetime.utcnow()
                    db_contact.updated_by_device_id = sync_req.device_identifier
        else:
            # Insert new contact
            db_contact = models.Contact(
                owner_user_id=user_id,
                device_contact_id=change.device_contact_id,
                name=change.name,
                first_name=change.first_name,
                last_name=change.last_name,
                phone_numbers=change.phone_numbers,
                emails=change.emails,
                organization=change.organization,
                job_title=change.job_title,
                addresses=change.addresses,
                birthday=change.birthday,
                created_by_device_id=sync_req.device_identifier,
                updated_by_device_id=sync_req.device_identifier,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(db_contact)
            db.flush() # get ID
            
            db_contact.sync_version = 1

    db.commit()
    
    # 2. Get server changes since last_sync_version
    max_version = db.query(func.max(models.Contact.sync_version)).filter(
        models.Contact.owner_user_id == user_id
    ).scalar() or 0
    
    server_changes = db.query(models.Contact).filter(
        models.Contact.owner_user_id == user_id,
        models.Contact.sync_version > sync_req.last_sync_version
    ).all()
    
    # Update device last_sync_version
    device.last_sync_version = max_version
    db.commit()
    
    return max_version, server_changes

def get_active_contacts(db: Session, user_id: int):
    return db.query(models.Contact).filter(
        models.Contact.owner_user_id == user_id,
        models.Contact.deleted_at.is_(None)
    ).all()