from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import os
import random
import time

from . import models, schemas, crud
from .database import engine, get_db
from .auth import get_current_user
from .config import settings
from .middleware import RequestContextMiddleware, SecurityHeadersMiddleware, rate_limit


# ---------------------------------------------------------------------------
# Database bootstrap (dev only — production should use Alembic)
# ---------------------------------------------------------------------------
if settings.is_dev:
    models.Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Textile Brokerage ERP API",
    version="1.0.0",
    description="Multi-tenant ERP for textile brokers. All data is user-scoped.",
)

# CORS — reads allowed origins from env config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression for large responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Security headers (HSTS, nosniff, frame-deny, CSP) on every response
app.add_middleware(SecurityHeadersMiddleware)

# Request-id tagging + structured JSON request logging + global exception handler
app.add_middleware(RequestContextMiddleware)

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Dashboard & Health
# ---------------------------------------------------------------------------

@app.get("/api/health")
def read_health():
    return {"status": "ok"}

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def read_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_dashboard_stats(db, current_user.id)


# ---------------------------------------------------------------------------
# Parties CRUD
# ---------------------------------------------------------------------------

@app.get("/api/parties", response_model=List[schemas.PartyResponse])
def read_parties(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_parties(db, current_user.id)


@app.post("/api/parties", response_model=schemas.PartyResponse)
def create_party(
    party: schemas.PartyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = crud.get_party_by_name(db, name=party.name, user_id=current_user.id)
    if existing:
        raise HTTPException(status_code=400, detail="You already have a party with this name")
    return crud.create_party(db=db, party=party, user_id=current_user.id)


@app.put("/api/parties/{party_id}", response_model=schemas.PartyResponse)
def update_party(
    party_id: int,
    party: schemas.PartyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        db_party = crud.update_party(db, party_id=party_id, party_in=party, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not db_party:
        raise HTTPException(status_code=404, detail="Party not found")
    return db_party


@app.delete("/api/parties/{party_id}", status_code=status.HTTP_200_OK)
def delete_party(
    party_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    success = crud.delete_party(db, party_id=party_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Party not found")
    return {"detail": "Party and all associated transactions successfully deleted"}


# ---------------------------------------------------------------------------
# Orders CRUD
# ---------------------------------------------------------------------------

def _order_response(o) -> schemas.OrderResponse:
    return schemas.OrderResponse(
        id=o.id, no=o.no, date=o.date, party_id=o.party_id,
        party_name=o.party.name, weaver=o.weaver, quality=o.quality,
        lot=o.lot, taka=o.taka, qty=o.qty, rate=o.rate, value=o.value,
        b_percent=o.b_percent, b_value=o.b_value, terms=o.terms, remarks=o.remarks,
    )


@app.get("/api/orders", response_model=List[schemas.OrderResponse])
def read_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    limit: int = 10000,
    offset: int = 0,
    search: Optional[str] = None,
    party_id: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
):
    orders = crud.get_orders(
        db, current_user.id, limit=limit, offset=offset,
        search=search, party_id=party_id, from_date=from_date, to_date=to_date,
    )
    return [_order_response(o) for o in orders]


@app.post("/api/orders", response_model=schemas.OrderResponse)
def create_order(
    order: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    o = crud.create_order(db=db, order=order, user_id=current_user.id)
    return _order_response(o)


@app.put("/api/orders/{order_id}", response_model=schemas.OrderResponse)
def update_order(
    order_id: int,
    order: schemas.OrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    o = crud.update_order(db, order_id=order_id, order_in=order, user_id=current_user.id)
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return _order_response(o)


@app.delete("/api/orders/{order_id}", status_code=status.HTTP_200_OK)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    success = crud.delete_order(db, order_id=order_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"detail": "Order successfully deleted"}


# ---------------------------------------------------------------------------
# Payments CRUD
# ---------------------------------------------------------------------------

def _payment_response(p) -> schemas.PaymentResponse:
    return schemas.PaymentResponse(
        id=p.id, party_id=p.party_id, party_name=p.party.name,
        amount=p.amount, date=p.date,
    )


@app.get("/api/payments", response_model=List[schemas.PaymentResponse])
def read_payments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    limit: int = 10000,
    offset: int = 0,
    party_id: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
):
    payments = crud.get_payments(
        db, current_user.id, limit=limit, offset=offset,
        party_id=party_id, from_date=from_date, to_date=to_date,
    )
    return [_payment_response(p) for p in payments]


@app.post("/api/payments", response_model=schemas.PaymentResponse)
def create_payment(
    payment: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = crud.create_payment(db=db, payment=payment, user_id=current_user.id)
    return _payment_response(p)


@app.put("/api/payments/{payment_id}", response_model=schemas.PaymentResponse)
def update_payment(
    payment_id: int,
    payment: schemas.PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = crud.update_payment(db, payment_id=payment_id, payment_in=payment, user_id=current_user.id)
    if not p:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return _payment_response(p)


@app.delete("/api/payments/{payment_id}", status_code=status.HTTP_200_OK)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    success = crud.delete_payment(db, payment_id=payment_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return {"detail": "Payment record successfully deleted"}


# ---------------------------------------------------------------------------
# Devices
# ---------------------------------------------------------------------------

@app.post("/api/devices", response_model=schemas.DeviceResponse)
def register_device(
    device: schemas.DeviceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.register_device(db=db, device=device, user_id=current_user.id)

# ---------------------------------------------------------------------------
# Contacts (Sync Engine)
# ---------------------------------------------------------------------------

@app.post("/api/contacts/sync", response_model=schemas.ContactSyncResponse)
def sync_contacts(
    sync_req: schemas.ContactSyncRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        server_version, server_changes = crud.sync_contacts(db=db, sync_req=sync_req, user_id=current_user.id)
        return schemas.ContactSyncResponse(
            server_version=server_version,
            changes=server_changes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/contacts", response_model=List[schemas.ContactResponse])
def get_contacts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_active_contacts(db=db, user_id=current_user.id)

# ---------------------------------------------------------------------------
# Brokerage summary
# ---------------------------------------------------------------------------

@app.get("/api/brokerage", response_model=List[schemas.BrokerageRow])
def read_brokerage(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_brokerage_summary(db, current_user.id)


# ---------------------------------------------------------------------------
# Root — serve a simple redirect hint (no legacy static files)
# ---------------------------------------------------------------------------

from fastapi.responses import JSONResponse, FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

_dist_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if settings.is_dev or not os.path.isdir(_dist_dir):
    @app.get("/")
    def read_root():
        return JSONResponse(
            {"message": "Textile Brokerage ERP API", "docs": "/docs", "health": "/api/health"}
        )
else:
    # Production: FastAPI serves the built React SPA directly (same-origin,
    # no CORS needed). Build first with `cd frontend && npm run build`.
    app.mount("/assets", StaticFiles(directory=os.path.join(_dist_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(_dist_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_dist_dir, "index.html"))
