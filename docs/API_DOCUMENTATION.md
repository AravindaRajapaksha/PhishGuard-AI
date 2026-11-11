# REST API Documentation — PhishGuard AI

**Base URL (Local Development):** `http://localhost:8000`  
**Interactive OpenAPI / Swagger UI:** `http://localhost:8000/docs`  
**ReDoc Documentation:** `http://localhost:8000/redoc`  
**API Version:** `v1` (`1.0.0`)  

---

## 1. Overview & Security Headers

All PhishGuard AI API endpoints exchange JSON payloads and include defensive HTTP security headers on every response:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`

Public URL scanning (`POST /api/v1/scan`) is protected by a sliding-window IP rate limiter (default: `30` requests per minute per client IP, configurable via `RATE_LIMIT_PER_MINUTE`).

---

## 2. Endpoints Reference

### 2.1 `POST /api/v1/scan` — Passively Analyze a URL

Validates the submitted URL, extracts 24 lexical and structural features in memory without visiting the URL, runs inference using the active `XGBoost` (`v1.0.0`) artifact, redacts sensitive query parameter values (`?token=[REDACTED]`), persists the scan in `scan_history`, and returns the prediction and feature breakdown.

#### Request Body
```json
{
  "url": "http://secure-login.paypal.com.account-verify.xyz/signin?token=secret123"
}
```

#### Response (`200 OK`)
```json
{
  "id": "e4c8f920-7b1a-4d3c-9c82-15a9b02f18a4",
  "submitted_url": "http://secure-login.paypal.com.account-verify.xyz/signin?token=[REDACTED]",
  "redacted_url": "http://secure-login.paypal.com.account-verify.xyz/signin?token=[REDACTED]",
  "hostname": "secure-login.paypal.com.account-verify.xyz",
  "prediction": "phishing",
  "phishing_score": 0.9994,
  "risk_level": "high",
  "model_version": "v1.0.0",
  "model_name": "XGBoost",
  "extracted_features": {
    "url_length": 73,
    "hostname_length": 42,
    "domain_length": 18,
    "path_length": 7,
    "query_length": 15,
    "dot_count": 4,
    "hyphen_count": 2,
    "hostname_hyphen_count": 2,
    "underscore_count": 0,
    "slash_count": 1,
    "digit_count": 3,
    "hostname_digit_count": 0,
    "special_char_count": 2,
    "at_symbol_present": 0,
    "subdomain_count": 3,
    "is_https": 0,
    "is_ip_address": 0,
    "has_punycode": 0,
    "suspicious_keyword_count": 5,
    "query_param_count": 1,
    "url_entropy": 4.2412,
    "hostname_entropy": 3.9183,
    "digit_to_length_ratio": 0.0411,
    "suspicious_hostname_pattern": 1
  },
  "feature_details": [
    {
      "name": "url_length",
      "label": "Total URL Length",
      "category": "Length & Structure",
      "value": 73,
      "description": "Total number of characters in the full URL string."
    }
  ],
  "risk_signals": [
    {
      "id": "suspicious_keywords",
      "title": "Contains Sensitive / Lure Keywords (5)",
      "severity": "high",
      "feature": "suspicious_keyword_count",
      "value": 5,
      "description": "Detected lexical tokens commonly used in credential harvesting or urgency lures ('login', 'signin', 'verify', 'secure', 'account')."
    }
  ],
  "scan_duration_ms": 6.42,
  "created_at": "2026-11-11T02:30:00Z",
  "disclaimer": "Machine learning predictions are estimates and cannot guarantee that a URL is safe."
}
```

#### Error Responses
- `422 Unprocessable Entity`: Invalid scheme, missing hostname, internal whitespace, or URL length > 2048 characters.
- `429 Too Many Requests`: Per-IP rate limit exceeded.

---

### 2.2 `GET /api/v1/history` — List Paginated Scan History

#### Query Parameters
- `page` (`int`, default `1`): 1-indexed page number.
- `page_size` (`int`, default `15`, max `100`): Records per page.
- `search` (`str`, optional): Case-insensitive substring match against `redacted_url` or `hostname`.
- `prediction` (`legitimate` | `suspicious` | `phishing`, optional): Filter by verdict.
- `start_date` (`YYYY-MM-DD`, optional): Filter scans on or after UTC date.
- `end_date` (`YYYY-MM-DD`, optional): Filter scans on or before UTC date.

---

### 2.3 `GET /api/v1/history/{scan_id}` — Inspect Scan Details

Returns the complete `ScanResponse` (including all 24 extracted features and triggered risk signals) for a specific scan UUID. Returns `404 Not Found` if the ID does not exist.

---

### 2.4 `DELETE /api/v1/history/{scan_id}` & `DELETE /api/v1/history`

- `DELETE /api/v1/history/{scan_id}`: Deletes a single historical scan record.
- `DELETE /api/v1/history`: Purges all stored scan history records.

---

### 2.5 `GET /api/v1/analytics/overview` — Dashboard Telemetry

Returns aggregated database telemetry (`total_scans`, `phishing_count`, `legitimate_count`, `suspicious_count`, percentages, `classification_distribution`, `scans_over_time`, `recent_scans`) alongside the active `model_summary`. Returns zeroed counts and empty lists when the database is empty.

---

### 2.6 `GET /api/v1/model/info` — Model Insights & Evaluation Metadata

Returns the active serialized model metadata (`v1.0.0`), dataset provenance and cleaning audit (`14,411` URLs), held-out test metrics, domain-grouped test metrics, 2x2 confusion matrix, all 4 candidate model benchmarks, and global feature importances.

---

### 2.7 `GET /api/v1/health` — System Health Check

Returns `status: "healthy"`, `model_loaded: true`, `model_version: "v1.0.0"`, and `database_connected: true`.
