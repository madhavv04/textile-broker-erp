"""
Cross-cutting HTTP middleware: request-id tagging, structured logging,
security headers, and a simple in-memory rate limiter.

The rate limiter is per-process/in-memory — fine for a single worker or dev.
For multi-worker/prod deployments, back it with Redis (swap `_hits` for a
Redis INCR + EXPIRE call; the interface below stays the same).
"""
import json
import logging
import time
import uuid
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger("textile_broker")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(_handler)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attaches a request_id, logs method/path/status/duration/user as JSON."""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.time()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.time() - start) * 1000, 2)
            logger.exception(
                json.dumps({
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": 500,
                    "duration_ms": duration_ms,
                })
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error", "request_id": request_id},
            )
        duration_ms = round((time.time() - start) * 1000, 2)
        user_id = getattr(request.state, "user_id", None)
        logger.info(
            json.dumps({
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "user_id": user_id,
            })
        )
        response.headers["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds standard security headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data:; "
            "script-src 'self'; style-src 'self' 'unsafe-inline'"
        )
        # Only relevant over HTTPS, harmless over HTTP (browsers ignore it there)
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


class _RateLimiter:
    """Sliding-window rate limiter keyed by (client_ip, bucket)."""

    def __init__(self):
        self._hits: dict[str, deque] = defaultdict(deque)

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.time()
        q = self._hits[key]
        while q and now - q[0] > window_seconds:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True


rate_limiter = _RateLimiter()


def rate_limit(bucket: str, limit: int, window_seconds: int = 60):
    """FastAPI dependency factory: raises 429 if the caller exceeds `limit`
    requests to `bucket` within `window_seconds`."""
    from fastapi import HTTPException, Request as FastAPIRequest

    def _dep(request: FastAPIRequest):
        client_ip = request.client.host if request.client else "unknown"
        key = f"{bucket}:{client_ip}"
        if not rate_limiter.allow(key, limit, window_seconds):
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Please try again in a minute.",
            )
        return True

    return _dep
