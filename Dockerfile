# ─── Stage 1: build the React frontend ──────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ─── Stage 2: Python backend, serving the built frontend ────────────────────
FROM python:3.12-slim AS base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY scripts/ ./scripts/
COPY alembic.ini .

# Copy the built frontend so FastAPI can serve it at "/" when ENV=prod
COPY --from=frontend-build /frontend/dist ./frontend/dist

# Expose the API port
EXPOSE 8000

# Production: gunicorn + uvicorn workers. Run `alembic upgrade head` before
# starting the server to ensure database schema is up-to-date.
CMD ["sh", "-c", "alembic upgrade head && gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000"]
