# Testing Strategy & Verification Report — PhishGuard AI

**Project Name:** PhishGuard AI  
**Document Version:** 1.0.0  
**Status:** Verified (All 28 Automated Backend, ML & Frontend Tests Passing)  

---

## 1. Testing Philosophy

PhishGuard AI is tested across three complementary layers—**Machine Learning & Feature Parity**, **FastAPI Backend & Database Persistence**, and **React + TypeScript Frontend UI/Integration**—to ensure that every prediction, privacy control, and API contract works reliably without mocked production shortcuts.

---

## 2. Backend & Machine Learning Test Suite (`pytest`)

Located in [`backend/tests/`](../backend/tests/) and executed via `pytest`:

### 2.1 URL Validation & Privacy Redaction (`tests/test_url_sanitizer.py` — 6 Tests)
- `test_validate_and_normalize_valid_urls`: Verifies scheme normalization, trimming, port handling, and IPv4 support.
- `test_validate_rejects_empty_or_non_string`: Ensures empty and whitespace strings raise `URLValidationError`.
- `test_validate_rejects_disallowed_schemes`: Blocks `javascript:`, `data:`, `ftp://`, `file://`, and scheme-less strings.
- `test_validate_rejects_excessive_length_and_whitespace`: Enforces the 2,048-character ceiling and rejects internal spaces/control characters.
- `test_extract_registrable_domain_and_subdomains`: Verifies standard TLDs, multi-part public suffixes (`.ac.uk`, `.co.uk`), and IP literals.
- `test_redact_url_for_storage_masks_sensitive_query_and_credentials`: Verifies that credentials before `@`, query parameter values (`?token=xyz987&email=alice@company.com`), and URL fragments are replaced with `[REDACTED]`.

### 2.2 Lexical Feature Extraction (`tests/test_feature_extraction.py` — 5 Tests)
- `test_feature_schema_completeness`: Confirms all 24 canonical features have complete metadata (`label`, `category`, `description`).
- `test_extract_url_features_clean_legitimate_url`: Verifies exact feature counts on a known benign URL.
- `test_extract_url_features_suspicious_phishing_patterns`: Verifies detection of IP literals, `@` symbol redirection, suspicious keywords, and generated risk signal explanations.
- `test_feature_vector_order_parity`: Ensures `extract_feature_vector()` preserves the exact column order of `FEATURE_NAMES`.
- `test_shannon_entropy_calculation`: Verifies Shannon information entropy mathematics on boundary cases.

### 2.3 ML Pipeline & Training–Serving Parity (`tests/test_ml_pipeline.py` — 4 Tests)
- `test_clean_and_deduplicate_removes_duplicates_and_conflicts`: Verifies removal of nulls, exact duplicates, and conflicting-label URLs.
- `test_domain_grouped_split_has_zero_domain_leakage`: Confirms `GroupShuffleSplit` produces zero overlap of registrable domains between training and testing sets.
- `test_model_registry_loads_trained_v1_artifact`: Verifies deserialization of `backend/app/ml/artifacts/v1/model.joblib` and `metadata.json`.
- `test_train_inference_feature_parity_and_prediction_service`: Confirms `build_feature_matrix()` (used in training) and `PredictionService.predict_url()` (used in serving) produce identical 24-feature vectors and accurate predictions.

### 2.4 REST API, Database & Security (`tests/test_api_endpoints.py` — 6 Tests)
- `test_health_endpoint_and_security_headers`: Verifies `/api/v1/health` and security headers (`X-Content-Type-Options`, `X-Frame-Options`).
- `test_analytics_overview_empty_database_state`: Verifies honest zeroed metrics when `scan_history` is empty.
- `test_scan_url_and_privacy_redaction_and_history_lifecycle`: End-to-end lifecycle test covering `POST /api/v1/scan`, query redaction in database storage, `GET /api/v1/history` filtering/search, `GET /api/v1/history/{id}`, `GET /api/v1/analytics/overview`, `DELETE /api/v1/history/{id}`, and `DELETE /api/v1/history`.
- `test_scan_validation_errors`: Verifies `422 Unprocessable Entity` on invalid URLs.
- `test_model_info_endpoint`: Verifies `/api/v1/model/info` returns authentic evaluation metrics for all 4 candidate models.
- `test_scan_rate_limiting`: Verifies sliding-window IP rate limiter returns `429 Too Many Requests` when limit is exceeded.

---

## 3. Frontend Test Suite (`Vitest` + `React Testing Library`)

Located in [`frontend/src/test/App.test.tsx`](../frontend/src/test/App.test.tsx) (`7` tests):
- Client-side URL validation unit tests (2 tests).
- `UrlScannerForm` validation alert and loading state tests (2 tests).
- `ScanResultView` verdict badge, redacted URL, safety disclaimer, and risk signal rendering test (1 test).
- `ScannerPage` API submission and error toast integration tests (2 tests).

---

## 4. How to Run All Tests Locally (Windows 11 PowerShell)

```powershell
# 1. Run Backend & ML Test Suite (21 tests)
cd backend
.\.venv\Scripts\python.exe -m pytest -v

# 2. Run Frontend TypeScript Check & Vitest Suite (7 tests)
cd ..\frontend
npm run lint
npm test
```
