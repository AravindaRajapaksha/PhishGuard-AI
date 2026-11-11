# Security and Privacy Architecture — PhishGuard AI

**Project Name:** PhishGuard AI  
**Document Version:** 1.0.0  
**Status:** Verified  

---

## 1. Passive URL Analysis Guarantee (Zero SSRF / Zero Beacon Risk)

The most critical security control in **PhishGuard AI** is that **neither the backend nor the frontend ever visits, resolves via DNS, fetches via HTTP/HTTPS, or executes a submitted URL**:

1. **In-Memory String Parsing Only:** [`backend/app/services/feature_extraction.py`](../backend/app/services/feature_extraction.py) uses only Python standard-library string/URI parsing (`urllib.parse.urlsplit`, `re`, `math`, `ipaddress`).
2. **SSRF Immunity by Design:** Because no network socket is opened toward the submitted URL, attackers cannot use PhishGuard AI to probe cloud metadata services (`http://169.254.169.254`), localhost ports, or internal corporate networks.
3. **Victim Beacon Protection:** Phishing campaigns often embed unique victim identifiers in URLs so that merely fetching the URL confirms to the attacker that the recipient's email address is active. Passive lexical analysis inspects the URL string without alerting the attacker's server.

---

## 2. Privacy-Preserving URL Storage (`url_sanitizer.py`)

Users frequently submit URLs copied from emails or messages that contain confidential query parameters (e.g., OAuth codes, password reset tokens, session IDs, or personal email addresses).

In [`backend/app/utils/url_sanitizer.py`](../backend/app/utils/url_sanitizer.py):
- Structural metrics (`query_length`, `query_param_count`) are computed in volatile memory during feature extraction.
- Immediately prior to database insertion (`scan_history.redacted_url`), `redact_url_for_storage()` replaces:
  - Every query parameter value with `[REDACTED]` (e.g., `?token=abc123&email=user@domain.com` $\rightarrow$ `?token=[REDACTED]&email=[REDACTED]`).
  - Any authority credentials before `@` with `[REDACTED]@`.
  - Any URL fragment after `#` with `#[REDACTED]`.
- Users can delete individual scan records (`DELETE /api/v1/history/{scan_id}`) or purge the entire scan history table (`DELETE /api/v1/history`) at any time.

---

## 3. Input Validation & XSS Prevention

1. **Strict Scheme Whitelist:** Only `http://` and `https://` schemes are accepted. Dangerous schemes (`javascript:`, `data:`, `vbscript:`, `file://`, `ftp://`) are rejected at both the client validator and Pydantic API boundary (`422 Unprocessable Entity`).
2. **Length & Character Bounds:** URLs exceeding `2,048` characters or containing ASCII control characters / internal whitespace are rejected.
3. **Non-Executable Rendering:** In the React UI, scanned URLs are rendered strictly as plain monospace text inside `<code>` / `<p>` containers and never as clickable `<a>` links, preventing accidental user navigation to a malicious destination.

---

## 4. API Hardening & Rate Limiting

- **Sliding-Window IP Rate Limiter:** `POST /api/v1/scan` enforces a per-IP sliding window limit (`RATE_LIMIT_PER_MINUTE`, default `30` requests/minute) returning `429 Too Many Requests` on abuse.
- **Explicit CORS Policy:** Allowed origins are controlled via `CORS_ORIGINS` environment configuration.
- **Exception Shielding:** Custom FastAPI exception handlers in [`backend/app/main.py`](../backend/app/main.py) return sanitized JSON error payloads so internal file paths, database strings, and stack traces are never leaked to clients.
- **Security Headers:** Every HTTP response sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer`.
