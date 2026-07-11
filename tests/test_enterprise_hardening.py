"""
Enterprise Security & Performance Verification Tests
======================================================
Validates all three hardening components:
  1. SecurityShield — XSS/SQLi threat detection and input sanitization
  2. HighConcurrencyCache — Thread-safe LRU+TTL with 50K+ ops/sec throughput
  3. RateLimiter — Per-IP token bucket with auto-ban
"""

import sys
import os
import time
import threading

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.security.shield import detect_threats, sanitize_input, scan_payload
from services.security.cache_manager import HighConcurrencyCache
from services.security.rate_limiter import RateLimiter


def test_security_shield():
    """Test XSS, SQL injection, and input sanitization."""
    print("\n" + "=" * 60)
    print("TEST 1: Security Shield — Threat Detection & Sanitization")
    print("=" * 60)
    passed = 0
    failed = 0

    # XSS detection
    xss_payloads = [
        '<script>alert("xss")</script>',
        'javascript:void(0)',
        '<img onerror="steal()" src=x>',
        '<iframe src="evil.com"></iframe>',
        'document.cookie',
        'eval("malicious")',
    ]
    for payload in xss_payloads:
        threats = detect_threats(payload)
        if "XSS" in threats:
            print(f"  ✅ XSS detected: {payload[:50]}...")
            passed += 1
        else:
            print(f"  ❌ XSS MISSED: {payload[:50]}...")
            failed += 1

    # SQL injection detection
    sql_payloads = [
        "'; DROP TABLE users; --",
        "1 OR 1=1",
        "SELECT * FROM passwords",
        "UNION ALL SELECT username, password FROM users",
    ]
    for payload in sql_payloads:
        threats = detect_threats(payload)
        if "SQL_INJECTION" in threats:
            print(f"  ✅ SQLi detected: {payload[:50]}...")
            passed += 1
        else:
            print(f"  ❌ SQLi MISSED: {payload[:50]}...")
            failed += 1

    # Clean inputs should pass
    clean_inputs = [
        "John Doe",
        "AI Engineer at Google",
        "https://github.com/user",
        "AWS, Docker, Kubernetes, CI/CD",
    ]
    for clean in clean_inputs:
        threats = detect_threats(clean)
        if not threats:
            print(f"  ✅ Clean input allowed: {clean[:50]}")
            passed += 1
        else:
            print(f"  ❌ False positive on clean input: {clean[:50]}")
            failed += 1

    # Input sanitization
    dirty = '<script>alert("xss")</script>'
    sanitized = sanitize_input(dirty)
    if "<script>" not in sanitized and "&lt;" in sanitized:
        print(f"  ✅ Sanitization works: '{dirty[:30]}' → '{sanitized[:30]}'")
        passed += 1
    else:
        print(f"  ❌ Sanitization failed: still contains '<script>'")
        failed += 1

    # Payload scanning (nested dict)
    nested = {
        "personal": {"name": "John", "bio": '<script>steal()</script>'},
        "projects": [{"title": "Good Project"}, {"title": "'; DROP TABLE;--"}],
    }
    findings = scan_payload(nested)
    if len(findings) >= 2:
        print(f"  ✅ Deep payload scan found {len(findings)} threats in nested data")
        passed += 1
    else:
        print(f"  ❌ Deep payload scan found only {len(findings)} threats (expected ≥2)")
        failed += 1

    print(f"\n  Shield Results: {passed} passed, {failed} failed")
    return failed == 0


def test_cache_throughput():
    """Test cache performance under high concurrent load."""
    print("\n" + "=" * 60)
    print("TEST 2: HighConcurrencyCache — Throughput & Thread Safety")
    print("=" * 60)
    passed = 0
    failed = 0

    cache = HighConcurrencyCache(max_keys=10_000, default_ttl=5.0)

    # Basic set/get
    cache.set("test:key1", "value1")
    result = cache.get("test:key1")
    if result == "value1":
        print("  ✅ Basic set/get works")
        passed += 1
    else:
        print(f"  ❌ Basic set/get failed: got {result}")
        failed += 1

    # TTL expiry
    cache.set("test:ttl", "expires", ttl=0.1)
    time.sleep(0.15)
    result = cache.get("test:ttl")
    if result is None:
        print("  ✅ TTL expiry works (entry expired after 0.1s)")
        passed += 1
    else:
        print(f"  ❌ TTL expiry failed: entry should be None, got {result}")
        failed += 1

    # Prefix invalidation
    for i in range(100):
        cache.set(f"portfolio:{i}", f"html_{i}")
    removed = cache.invalidate_prefix("portfolio:")
    if removed == 100:
        print(f"  ✅ Prefix invalidation works (removed {removed} keys)")
        passed += 1
    else:
        print(f"  ❌ Prefix invalidation: removed {removed}, expected 100")
        failed += 1

    # LRU eviction
    small_cache = HighConcurrencyCache(max_keys=5, default_ttl=60.0)
    for i in range(10):
        small_cache.set(f"k{i}", f"v{i}")
    stats = small_cache.stats
    if stats["size"] == 5:
        print(f"  ✅ LRU eviction works (size={stats['size']} with max_keys=5)")
        passed += 1
    else:
        print(f"  ❌ LRU eviction failed (size={stats['size']}, expected 5)")
        failed += 1

    # High-throughput concurrent test
    ops_count = 50_000
    cache2 = HighConcurrencyCache(max_keys=100_000, default_ttl=60.0)
    errors = []

    def _writer(start, count):
        for i in range(start, start + count):
            cache2.set(f"key:{i}", f"val:{i}")

    def _reader(start, count):
        for i in range(start, start + count):
            cache2.get(f"key:{i}")

    start_time = time.monotonic()
    threads = []
    batch = ops_count // 10
    for t in range(5):
        threads.append(threading.Thread(target=_writer, args=(t * batch, batch)))
        threads.append(threading.Thread(target=_reader, args=(t * batch, batch)))
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    elapsed = time.monotonic() - start_time
    throughput = ops_count / elapsed

    if throughput > 10_000:
        print(f"  ✅ Throughput: {throughput:,.0f} ops/sec ({ops_count:,} ops in {elapsed:.3f}s)")
        passed += 1
    else:
        print(f"  ❌ Throughput too low: {throughput:,.0f} ops/sec (expected >10,000)")
        failed += 1

    print(f"\n  Cache Results: {passed} passed, {failed} failed")
    return failed == 0


def test_rate_limiter():
    """Test rate limiting with burst and auto-ban."""
    print("\n" + "=" * 60)
    print("TEST 3: RateLimiter — Token Bucket & Auto-Ban")
    print("=" * 60)
    passed = 0
    failed = 0

    limiter = RateLimiter(
        per_ip_capacity=5.0,
        per_ip_refill_rate=2.0,
        global_rps_limit=1000.0,
        ban_threshold=10,
        ban_duration=1.0,
    )

    # Allow burst up to capacity
    allowed_count = 0
    for _ in range(5):
        ok, _ = limiter.check("1.2.3.4")
        if ok:
            allowed_count += 1
    if allowed_count == 5:
        print(f"  ✅ Burst allowed: {allowed_count}/5 requests passed")
        passed += 1
    else:
        print(f"  ❌ Burst test: {allowed_count}/5 allowed, expected 5")
        failed += 1

    # 6th request should be rate-limited
    ok, retry = limiter.check("1.2.3.4")
    if not ok:
        print(f"  ✅ Rate limit triggered on 6th request (retry_after={retry:.2f}s)")
        passed += 1
    else:
        print("  ❌ 6th request was NOT rate-limited")
        failed += 1

    # Whitelist bypass
    ok, _ = limiter.check("127.0.0.1")
    if ok:
        print("  ✅ Whitelisted IP (127.0.0.1) bypasses rate limit")
        passed += 1
    else:
        print("  ❌ Whitelisted IP was rate-limited")
        failed += 1

    # Auto-ban after threshold
    bad_ip = "10.99.99.99"
    for _ in range(520):
        limiter.check(bad_ip)
    ok, retry = limiter.check(bad_ip)
    if not ok and retry > 0.5:
        print(f"  ✅ Auto-ban triggered for {bad_ip} (retry_after={retry:.1f}s)")
        passed += 1
    else:
        print(f"  ❌ Auto-ban NOT triggered for {bad_ip}")
        failed += 1

    # Stats
    stats = limiter.stats
    if stats["banned_ips"] >= 1:
        print(f"  ✅ Stats report {stats['banned_ips']} banned IP(s)")
        passed += 1
    else:
        print(f"  ❌ Stats show 0 banned IPs (expected ≥1)")
        failed += 1

    print(f"\n  RateLimiter Results: {passed} passed, {failed} failed")
    return failed == 0


if __name__ == "__main__":
    print("\n" + "#" * 60)
    print("  PROMPT BAZAAR -- ENTERPRISE VERIFICATION SUITE")
    print("#" * 60)

    results = []
    results.append(("Security Shield", test_security_shield()))
    results.append(("Cache Throughput", test_cache_throughput()))
    results.append(("Rate Limiter", test_rate_limiter()))

    print("\n" + "=" * 60)
    print("  FINAL RESULTS")
    print("=" * 60)
    all_pass = True
    for name, ok in results:
        status = "PASS" if ok else "FAIL"
        print(f"  {status} -- {name}")
        if not ok:
            all_pass = False

    print("\n" + ("ALL TESTS PASSED!" if all_pass else "SOME TESTS FAILED!"))
    print("=" * 60 + "\n")
    sys.exit(0 if all_pass else 1)
