"""
High-Concurrency Thread-Safe LRU + TTL Cache Engine
=====================================================
Designed to shield the Flask backend from traffic spikes of 110,000–200,000+
concurrent users by serving hot data from memory in <1ms.

Features:
  - Thread-safe via threading.Lock (GIL-independent correctness)
  - Configurable max_keys (default 100,000) with automatic LRU eviction
  - Per-entry TTL expiration (default 300s / 5 minutes)
  - Stale-While-Revalidate: returns expired data immediately while
    scheduling a background refresh via the provided callback
  - Bulk invalidation by key prefix
  - Automatic periodic cleanup of expired entries
"""

import threading
import time
import logging
from collections import OrderedDict
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class CacheEntry:
    """Immutable value holder with creation timestamp and TTL."""

    __slots__ = ("value", "created_at", "ttl")

    def __init__(self, value: Any, ttl: float):
        self.value = value
        self.created_at = time.monotonic()
        self.ttl = ttl

    @property
    def is_expired(self) -> bool:
        return (time.monotonic() - self.created_at) > self.ttl

    @property
    def age_seconds(self) -> float:
        return time.monotonic() - self.created_at


class HighConcurrencyCache:
    """
    Thread-safe LRU cache with TTL expiration and stale-while-revalidate.

    Usage:
        cache = HighConcurrencyCache(max_keys=100_000, default_ttl=300)
        cache.set("portfolio:john-doe", html_string)
        result = cache.get("portfolio:john-doe")  # <1ms
    """

    def __init__(
        self,
        max_keys: int = 100_000,
        default_ttl: float = 300.0,
        cleanup_interval: float = 60.0,
    ):
        self._store: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.Lock()
        self._max_keys = max_keys
        self._default_ttl = default_ttl
        self._hits = 0
        self._misses = 0

        # Background cleanup thread
        self._cleanup_interval = cleanup_interval
        self._cleanup_thread = threading.Thread(
            target=self._periodic_cleanup, daemon=True
        )
        self._cleanup_thread.start()
        logger.info(
            "HighConcurrencyCache initialized: max_keys=%d, default_ttl=%.0fs",
            max_keys,
            default_ttl,
        )

    # ── Core API ────────────────────────────────────────────────────────

    def get(self, key: str) -> Optional[Any]:
        """Return cached value or None.  Moves key to MRU position."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            if entry.is_expired:
                del self._store[key]
                self._misses += 1
                return None
            # Move to end (most-recently-used)
            self._store.move_to_end(key)
            self._hits += 1
            return entry.value

    def get_or_revalidate(
        self,
        key: str,
        revalidate_fn: Callable[[], Any],
        stale_grace: float = 30.0,
    ) -> Optional[Any]:
        """
        Stale-While-Revalidate pattern.

        If the entry is within TTL, return it.
        If the entry is expired but within stale_grace seconds past TTL,
        return the stale value immediately AND schedule a background
        revalidation via *revalidate_fn*.
        Otherwise, return None (cache miss).
        """
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None

            age = entry.age_seconds
            if age <= entry.ttl:
                self._store.move_to_end(key)
                self._hits += 1
                return entry.value

            if age <= entry.ttl + stale_grace:
                # Stale but within grace period — return immediately
                self._hits += 1
                stale_value = entry.value

                # Background revalidation
                def _revalidate():
                    try:
                        fresh = revalidate_fn()
                        if fresh is not None:
                            self.set(key, fresh, ttl=entry.ttl)
                    except Exception as exc:
                        logger.warning("Cache revalidation failed for %s: %s", key, exc)

                threading.Thread(target=_revalidate, daemon=True).start()
                return stale_value

            # Beyond grace period — true miss
            del self._store[key]
            self._misses += 1
            return None

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        """Insert or update a cache entry."""
        effective_ttl = ttl if ttl is not None else self._default_ttl
        with self._lock:
            if key in self._store:
                del self._store[key]
            self._store[key] = CacheEntry(value, effective_ttl)
            self._store.move_to_end(key)
            self._evict_lru()

    def delete(self, key: str) -> bool:
        """Remove a specific key. Returns True if the key existed."""
        with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    def invalidate_prefix(self, prefix: str) -> int:
        """Remove all keys starting with *prefix*. Returns count removed."""
        with self._lock:
            keys_to_remove = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_remove:
                del self._store[k]
            if keys_to_remove:
                logger.info("Invalidated %d keys with prefix '%s'", len(keys_to_remove), prefix)
            return len(keys_to_remove)

    def clear(self) -> None:
        """Flush the entire cache."""
        with self._lock:
            self._store.clear()
            logger.info("Cache cleared")

    # ── Diagnostics ─────────────────────────────────────────────────────

    @property
    def stats(self) -> dict:
        with self._lock:
            total = self._hits + self._misses
            return {
                "size": len(self._store),
                "max_keys": self._max_keys,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(self._hits / total, 4) if total > 0 else 0.0,
            }

    # ── Internal ────────────────────────────────────────────────────────

    def _evict_lru(self) -> None:
        """Evict least-recently-used entries if we exceed max_keys. Must hold lock."""
        while len(self._store) > self._max_keys:
            evicted_key, _ = self._store.popitem(last=False)
            logger.debug("LRU eviction: %s", evicted_key)

    def _periodic_cleanup(self) -> None:
        """Background thread that removes expired entries periodically."""
        while True:
            time.sleep(self._cleanup_interval)
            try:
                with self._lock:
                    expired_keys = [
                        k for k, v in self._store.items() if v.is_expired
                    ]
                    for k in expired_keys:
                        del self._store[k]
                    if expired_keys:
                        logger.debug("Cleanup removed %d expired entries", len(expired_keys))
            except Exception as exc:
                logger.error("Cache cleanup error: %s", exc)
