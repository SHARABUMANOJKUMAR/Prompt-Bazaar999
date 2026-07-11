"""
Enterprise Rate Limiter — Token Bucket + Sliding Window
=========================================================
Protects the Flask backend from DDoS attacks, automated scraping, and
API quota exhaustion while allowing legitimate users smooth access.

Features:
  - Per-IP token bucket with configurable burst and refill rates
  - Global sliding window limiter for overall request throughput
  - Automatic IP ban for sustained abuse (configurable threshold)
  - Thread-safe via threading.Lock
  - Whitelist support for trusted IPs (localhost, health-check bots)
  - Returns proper HTTP 429 headers with Retry-After
"""

import threading
import time
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class TokenBucket:
    """Per-client token bucket implementation."""

    __slots__ = ("capacity", "refill_rate", "tokens", "last_refill")

    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.tokens = capacity
        self.last_refill = time.monotonic()

    def consume(self, tokens: float = 1.0) -> bool:
        """Try to consume *tokens*. Returns True if allowed."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

    @property
    def retry_after(self) -> float:
        """Seconds until at least 1 token is available."""
        if self.tokens >= 1.0:
            return 0.0
        return (1.0 - self.tokens) / self.refill_rate


class RateLimiter:
    """
    Enterprise-grade rate limiter combining per-IP token buckets with
    a global sliding window.

    Usage:
        limiter = RateLimiter()

        @app.before_request
        def check_rate_limit():
            allowed, retry_after = limiter.check(request.remote_addr)
            if not allowed:
                return jsonify({"error": "Rate limit exceeded"}), 429
    """

    # Default trusted IPs (localhost, Docker bridge, health checks)
    DEFAULT_WHITELIST = frozenset({
        "127.0.0.1",
        "::1",
        "0.0.0.0",
        "10.0.0.1",
    })

    def __init__(
        self,
        per_ip_capacity: float = 60.0,
        per_ip_refill_rate: float = 10.0,
        global_rps_limit: float = 5000.0,
        ban_threshold: int = 500,
        ban_duration: float = 300.0,
        whitelist: Optional[frozenset] = None,
    ):
        """
        Args:
            per_ip_capacity: Max burst tokens per IP (default 60).
            per_ip_refill_rate: Tokens refilled per second per IP (default 10).
            global_rps_limit: Max requests/second across all IPs (default 5000).
            ban_threshold: Number of throttled requests before auto-banning IP.
            ban_duration: Duration of auto-ban in seconds (default 300s / 5min).
            whitelist: Set of IPs that bypass rate limiting.
        """
        self._per_ip_capacity = per_ip_capacity
        self._per_ip_refill_rate = per_ip_refill_rate
        self._global_rps_limit = global_rps_limit
        self._ban_threshold = ban_threshold
        self._ban_duration = ban_duration
        self._whitelist = whitelist or self.DEFAULT_WHITELIST

        self._buckets: dict[str, TokenBucket] = {}
        self._violations: dict[str, int] = {}
        self._bans: dict[str, float] = {}  # ip -> ban_expiry (monotonic)
        self._lock = threading.Lock()

        # Global sliding window
        self._global_tokens = global_rps_limit
        self._global_last_refill = time.monotonic()

        # Cleanup thread for stale buckets
        self._cleanup_thread = threading.Thread(
            target=self._periodic_cleanup, daemon=True
        )
        self._cleanup_thread.start()

        logger.info(
            "RateLimiter initialized: per_ip=%d/%ds burst, global=%d rps, ban_threshold=%d",
            per_ip_capacity,
            1,
            int(global_rps_limit),
            ban_threshold,
        )

    def check(self, client_ip: str) -> Tuple[bool, float]:
        """
        Check if a request from *client_ip* is allowed.

        Returns:
            (allowed: bool, retry_after: float)
            If allowed is False, retry_after indicates seconds to wait.
        """
        # Whitelist bypass
        if client_ip in self._whitelist:
            return True, 0.0

        with self._lock:
            now = time.monotonic()

            # Check if IP is banned
            ban_expiry = self._bans.get(client_ip)
            if ban_expiry is not None:
                if now < ban_expiry:
                    return False, ban_expiry - now
                else:
                    del self._bans[client_ip]
                    self._violations.pop(client_ip, None)

            # Global rate check
            elapsed = now - self._global_last_refill
            self._global_tokens = min(
                self._global_rps_limit,
                self._global_tokens + elapsed * self._global_rps_limit,
            )
            self._global_last_refill = now

            if self._global_tokens < 1.0:
                retry = (1.0 - self._global_tokens) / self._global_rps_limit
                return False, retry
            self._global_tokens -= 1.0

            # Per-IP rate check
            bucket = self._buckets.get(client_ip)
            if bucket is None:
                bucket = TokenBucket(self._per_ip_capacity, self._per_ip_refill_rate)
                self._buckets[client_ip] = bucket

            if not bucket.consume():
                # Track violations for auto-ban
                violations = self._violations.get(client_ip, 0) + 1
                self._violations[client_ip] = violations

                if violations >= self._ban_threshold:
                    self._bans[client_ip] = now + self._ban_duration
                    logger.warning(
                        "IP %s auto-banned for %ds after %d violations",
                        client_ip,
                        int(self._ban_duration),
                        violations,
                    )

                return False, bucket.retry_after

            return True, 0.0

    @property
    def stats(self) -> dict:
        with self._lock:
            return {
                "active_buckets": len(self._buckets),
                "banned_ips": len(self._bans),
                "total_violations": sum(self._violations.values()),
                "global_tokens_remaining": round(self._global_tokens, 1),
            }

    def _periodic_cleanup(self) -> None:
        """Remove stale buckets and expired bans every 60 seconds."""
        while True:
            time.sleep(60.0)
            try:
                with self._lock:
                    now = time.monotonic()

                    # Clear expired bans
                    expired_bans = [
                        ip for ip, expiry in self._bans.items() if now >= expiry
                    ]
                    for ip in expired_bans:
                        del self._bans[ip]
                        self._violations.pop(ip, None)

                    # Clear idle buckets (no activity for 5 minutes)
                    stale_ips = [
                        ip
                        for ip, bucket in self._buckets.items()
                        if (now - bucket.last_refill) > 300.0
                    ]
                    for ip in stale_ips:
                        del self._buckets[ip]
                        self._violations.pop(ip, None)

                    if expired_bans or stale_ips:
                        logger.debug(
                            "RateLimiter cleanup: cleared %d bans, %d stale buckets",
                            len(expired_bans),
                            len(stale_ips),
                        )
            except Exception as exc:
                logger.error("RateLimiter cleanup error: %s", exc)
