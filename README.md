# Textile Brokerage ERP

A multi-tenant ERP for textile brokers: track parties (buyers/sellers),
orders, payments, and brokerage — with an Indian-market focus (₹ formatting,
+91 mobile numbers, OTP-based registration).

Every user's data is fully isolated: parties, orders, and payments are
scoped to the account that created them via an `owner_user_id` foreign key
enforced at every layer (models → CRUD → API). See `tests/test_isolation.py`
for the regression test covering this.

## Features

- **Dashboard** — order count, total meters, brokerage earned, outstanding balance
- **Parties** — buyer/seller directory with payment terms
- **Orders** — order entry with auto-calculated value and brokerage
- **Payments** — payment tracking against parties
- **Brokerage** — per-party brokerage summary
- **Reports** — monthly brokerage trend, top parties, outstanding-by-party (charts via recharts)
- JWT auth with OTP-based registration (mobile OTP, hashed + persisted, rate-limited)
- Mobile-friendly: swipe between tabs, swipe-down to dismiss modals, card-style
  tables on small screens, installable as a PWA

## Stack

- **Backend:** FastAPI + SQLAlchemy 2.x + Alembic. SQLite for local dev,
  PostgreSQL for production (via docker-compose).
- **Frontend:** React 19 + Vite, plain CSS (no framework), recharts for charts.
- **Auth:** JWT (PyJWT) + bcrypt password hashing.

## Project layout

```
app/                  FastAPI backend
  main.py             Routes, middleware wiring
  models.py           SQLAlchemy models (owner_user_id on every tenant table)
  crud.py             All queries scoped by user_id
  auth.py             Password hashing (bcrypt) + JWT
  config.py           Env-based settings (pydantic-settings)
  middleware.py        Request-ID logging, security headers, rate limiting
  otp_store.py        Persistent, hashed OTP storage
  otp_provider.py     SMS provider abstraction (stub — wire up Twilio/MSG91/etc.)
  audit.py            Audit log table + helper
frontend/             React + Vite SPA
alembic/              DB migrations
scripts/
  seed_demo_users.py  Creates alice + bob for manual isolation testing
  backfill_owner.py   One-time backfill for pre-multi-tenancy databases
tests/                pytest suite (isolation, auth, crud)
```

## Local development

```bash
# 1. Configure environment
cp .env.example .env
# then edit .env — at minimum set JWT_SECRET_KEY:
python -c "import secrets; print(secrets.token_hex(32))"

# 2. Backend
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head
python scripts/seed_demo_users.py     # optional — creates alice/bob

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev      # http://localhost:5173, proxies /api to :8000

# 4. Backend server (separate terminal)
uvicorn app.main:app --reload --port 8000
```

Or use `python run.py` to start both dev servers together (dev only — not
for production; see below).

## Running tests

```bash
pytest tests/ -v
```

`tests/test_isolation.py` is the regression test for the core multi-tenancy
bug: it registers two users, has one create data, and asserts the other
cannot see, edit, or delete it via any endpoint or HTTP verb.

## Manual isolation test

```bash
python scripts/seed_demo_users.py
```

1. Log in as `alice` / `Alice@1234`.
2. Add a party, an order, and a payment.
3. Log out, log in as `bob` / `Bob@12345`.
4. Confirm bob's dashboard, parties, orders, payments, and brokerage are
   all empty — none of alice's data is visible.

## Production deployment (Docker)

```bash
cp .env.example .env   # set JWT_SECRET_KEY, ENV=prod, etc.
docker compose up --build -d
curl http://localhost:8000/api/health
```

`docker-compose.yml` runs three services: `web` (FastAPI, serving the built
React app at `/`), `db` (PostgreSQL), and `redis` (reserved for OTP/rate-limit
storage if you scale beyond a single worker — see `app/middleware.py` and
`app/otp_store.py` for where to swap in a Redis-backed implementation).

The `web` service runs `alembic upgrade head` automatically before starting.

### Building the frontend separately

If you prefer to serve the frontend from its own container/CDN instead of
letting FastAPI serve `frontend/dist`:

```bash
cd frontend
npm run build
docker build -t textile-broker-frontend -f frontend/Dockerfile frontend/
```

See `frontend/nginx.conf` for the Nginx config (SPA fallback + `/api` proxy).

## Environment variables

See `.env.example` for the full list. Key ones:

| Variable | Purpose |
|---|---|
| `JWT_SECRET_KEY` | **Required in prod.** Signs JWTs. |
| `DATABASE_URL` | `sqlite:///./textile_broker.db` (dev) or `postgresql://...` (prod) |
| `ENV` | `dev` (returns OTP in API responses, dev-mode bootstrap) or `prod` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime (default 1440 = 24h) |
| `CORS_ORIGINS` | Comma-separated allowed origins (dev only — prod is same-origin) |
| `DEFAULT_ADMIN_USERNAME` | Used by `scripts/backfill_owner.py` |

## Migrations

```bash
alembic upgrade head                                   # apply all migrations
alembic revision --autogenerate -m "add some_column"    # create a new one
```

## Known limitations

- Money fields (`qty`, `rate`, `value`, `b_value`, `amount`) are `Float`, not
  `Decimal`/`Numeric`. This can introduce small rounding errors on large sums.
  Switching to `Numeric(12, 2)` is a breaking schema change — left as a
  documented limitation for this pass; would need its own Alembic migration.
- `get_brokerage_summary` does one query per party (N+1). Fine at current
  scale; replace with a single `GROUP BY` join if the party list grows large.
- The rate limiter and OTP store are process-local (SQLite-backed OTPs,
  in-memory rate limiter). This is correct for a single-worker deployment;
  if you scale to multiple workers/instances, back both with the `redis`
  service already included in docker-compose.
- `frontend/public/manifest.json` references `/icons/icon-192.png` and
  `/icons/icon-512.png`, which are not included — add real PNG icons at
  those sizes before relying on "Add to Home Screen" install prompts.
- `otp_provider.py` is a stub; no SMS actually sends until you wire up a
  real provider (Twilio, MSG91, etc.) and set `ENV=prod`.
