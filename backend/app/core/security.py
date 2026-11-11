"""Rate limiting and HTTP security controls for PhishGuard AI."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from app.core.config import settings


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding-window rate limiter keyed by client IP."""

    def __init__(self, max_requests: int = 30, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def check_request(self, client_key: str) -> None:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        limit = max(1, settings.RATE_LIMIT_PER_MINUTE)

        with self._lock:
            bucket = self._hits[client_key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Rate limit exceeded ({limit} scans per minute). "
                        "Please wait before submitting additional URLs."
                    ),
                )
            bucket.append(now)


scan_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.RATE_LIMIT_PER_MINUTE, window_seconds=60
)


def enforce_scan_rate_limit(request: Request) -> None:
    """FastAPI dependency enforcing per-IP scan rate limits."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "unknown"

    scan_rate_limiter.check_request(client_ip)
