# System Requirements Specification (SRS) — PhishGuard AI

**Project Name:** PhishGuard AI  
**Document Version:** 1.0.0  
**Status:** Phase 1 – Approved  

---

## 1. Introduction

This document specifies the functional and non-functional requirements for **PhishGuard AI**, an intelligent machine learning-based phishing URL detection web application. Every requirement is traceable to the master project objectives and will be verified during Phases 2 through 6.

---

## 2. Functional Requirements

### 2.1 URL Scanning & Validation (`FR-SCAN`)

- **FR-SCAN-01 (URL Input & Submission):** Users shall be able to submit a URL string via the Hero Scanner on the Landing Page or the dedicated URL Scanner Page.
- **FR-SCAN-02 (Format & Scheme Validation):** The frontend and backend shall validate that the submitted string:
  - Is non-empty and does not exceed 2,048 characters.
  - Uses an explicit `http://` or `https://` scheme (or clearly prompts the user / normalizes missing scheme on explicit user action where appropriate, while backend strictly validates well-formed `http`/`https` URLs with a valid hostname).
  - Contains no control characters or whitespace.
- **FR-SCAN-03 (Passive Processing Guarantee):** Neither the frontend nor the backend shall ever visit, resolve via DNS, fetch via HTTP/HTTPS, or execute the submitted URL.
- **FR-SCAN-04 (Safe Example URLs):** The URL Scanner interface shall provide one-click safe, non-sensitive example URLs representing legitimate, suspicious, and phishing structural patterns for testing without exposing real users to live threats.
- **FR-SCAN-05 (Real-Time Feedback & Controls):** The scanner UI shall provide a clear input button, client-side validation messages, loading/processing state indicators during API execution, and only render scan results after receiving an authentic backend response.

### 2.2 Feature Extraction, Prediction & Explainability (`FR-ML`)

- **FR-ML-01 (Lexical & Structural Feature Extraction):** The system shall extract a standardized vector of at least 20 lexical and structural features from the submitted URL, including:
  1. `url_length` (Total URL character length)
  2. `hostname_length` (Hostname character length)
  3. `domain_length` (Registrable domain length)
  4. `path_length` (URL path character length)
  5. `query_length` (Query string character length)
  6. `dot_count` (Number of `.` characters)
  7. `hyphen_count` (Number of `-` characters in URL)
  8. `hostname_hyphen_count` (Number of `-` characters in hostname)
  9. `underscore_count` (Number of `_` characters)
  10. `slash_count` (Number of `/` characters in path)
  11. `digit_count` (Total numeric digits in URL)
  12. `hostname_digit_count` (Numeric digits in hostname)
  13. `special_char_count` (Count of `?=&#%~+:;$!*`, etc.)
  14. `at_symbol_present` (Binary indicator for `@` in URL)
  15. `subdomain_count` (Number of subdomain levels)
  16. `is_https` (Binary indicator for `https` scheme — treated as structural context, never as proof of safety)
  17. `is_ip_address` (Binary indicator for IPv4/IPv6 literal hostname)
  18. `has_punycode` (Binary indicator for `xn--` internationalized domain encoding)
  19. `suspicious_keyword_count` (Count of high-risk tokens such as `login`, `verify`, `secure`, `account`, `update`, `banking`, `signin`, `confirm`, `wallet`, `password`)
  20. `query_param_count` (Number of query key-value parameters)
  21. `url_entropy` (Shannon entropy of the URL string)
  22. `hostname_entropy` (Shannon entropy of the hostname string)
  23. `digit_to_length_ratio` (Ratio of digits to total URL length)
  24. `suspicious_tld_indicator` (Indicator for commonly abused high-risk or deceptive TLD patterns / multiple embedded TLDs)
- **FR-ML-02 (Three-Tier Classification Policy):** Based on the trained model's predicted phishing score $p \in [0.0, 1.0]$:
  - **Legitimate (`legitimate`):** $p < \tau_{\text{low}}$ (default $\tau_{\text{low}} = 0.35$, subject to Phase 2 calibration on validation data)
  - **Suspicious / Uncertain (`suspicious`):** $\tau_{\text{low}} \le p < \tau_{\text{high}}$
  - **Phishing (`phishing`):** $p \ge \tau_{\text{high}}$ (default $\tau_{\text{high}} = 0.65$, subject to Phase 2 calibration)
- **FR-ML-03 (Human-Readable Risk Signals):** Each scan response shall return structured risk indicators and feature explanations identifying which specific URL properties elevated or lowered risk (e.g., presence of `@` symbol, IP literal hostname, excessive subdomain nesting, high keyword count, or abnormal URL length).
- **FR-ML-04 (Mandatory Safety Disclaimer):** All scan results shall prominently display: *"Machine learning predictions are estimates and cannot guarantee that a URL is safe."*

### 2.3 Scan History & Privacy Controls (`FR-HIST`)

- **FR-HIST-01 (Automatic Query Redaction):** Before saving a scan record to the database, sensitive query parameter values shall be redacted (e.g., `https://example.com/reset?token=[REDACTED]&user=[REDACTED]`) so private tokens or PII are never persisted.
- **FR-HIST-02 (Paginated History Listing):** Users shall be able to browse past scan records with server-side pagination.
- **FR-HIST-03 (Search & Filtering):** Users shall be able to filter scan history by:
  - URL substring search
  - Classification (`phishing`, `suspicious`, `legitimate`)
  - Date range (`start_date`, `end_date`)
- **FR-HIST-04 (Detailed Scan Inspection):** Clicking any historical scan record shall open a detailed view showing the redacted URL, classification, model score, timestamp, model version, risk signals, and extracted feature values.
- **FR-HIST-05 (Record Deletion & History Clearing):** Users shall be able to delete an individual scan record (`DELETE /api/v1/history/{scan_id}`) or clear all scan history records (`DELETE /api/v1/history`) with confirmation.

### 2.4 Analytics Dashboard (`FR-DASH`)

- **FR-DASH-01 (Real Database Telemetry):** The Analytics Dashboard shall compute and display:
  - Total scans performed
  - Count and percentage of Phishing predictions
  - Count and percentage of Legitimate predictions
  - Count and percentage of Suspicious / Uncertain predictions
  - Classification distribution chart (Donut/Pie chart via Recharts)
  - Scans over time chart (Area/Bar chart grouped by date)
  - Recent scan activity table
  - Summary of active model evaluation metrics
- **FR-DASH-02 (Honest Empty States):** When the database contains zero scan records, the dashboard shall render clean, informative empty states with a call-to-action to scan a URL—never fabricated numbers.

### 2.5 Model Insights (`FR-INSIGHTS`)

- **FR-INSIGHTS-01 (Model Metadata & Provenance):** Display the active model's name, algorithm family, version identifier, training timestamp, and dataset provenance summary.
- **FR-INSIGHTS-02 (Authentic Evaluation Metrics):** Display true held-out test set metrics: Accuracy, Precision, Recall, F1-Score, ROC-AUC, PR-AUC, and the 2x2 Confusion Matrix (True Positives, False Positives, True Negatives, False Negatives).
- **FR-INSIGHTS-03 (Model Comparison Table):** Display the benchmark comparison across all trained candidate models (Logistic Regression, Decision Tree, Random Forest, XGBoost) showing why the production model was selected.
- **FR-INSIGHTS-04 (Feature Importance Visualization):** Render a Recharts horizontal bar chart of the top features ranked by importance, accompanied by a clear explanation that global feature importance reflects overall model behavior across the dataset rather than causal proof for an individual URL.

### 2.6 Navigation, Theme & Pages (`FR-UI`)

- **FR-UI-01 (Primary Navigation):** Provide responsive desktop and mobile navigation linking to:
  1. Overview (Landing Page)
  2. URL Scanner
  3. Scan History
  4. Analytics (Dashboard)
  5. Model Insights
  6. About
- **FR-UI-02 (Theme System):** Support Dark Mode (default cybersecurity SaaS theme with deep navy/slate backgrounds and electric blue/cyan accents) and Light Mode with persistent preference storage.

---

## 3. Non-Functional Requirements

### 3.1 Security (`NFR-SEC`)
- **NFR-SEC-01:** Rate limit public `/api/v1/scan` requests (e.g., 30 requests per minute per client IP, configurable via environment variables) to prevent abuse and denial-of-service.
- **NFR-SEC-02:** Restrict CORS origins via configuration (`CORS_ORIGINS`).
- **NFR-SEC-03:** Sanitize all error responses so internal file paths, database credentials, and Python stack traces are never exposed to clients.
- **NFR-SEC-04:** Store all secrets and connection strings in environment variables (`.env`), excluded from version control.

### 3.2 Performance (`NFR-PERF`)
- **NFR-PERF-01:** Load the serialized ML model into memory once at FastAPI startup (singleton lifecycle) so single-URL feature extraction and inference complete in `< 50 ms` on average (excluding network transit).
- **NFR-PERF-02:** Index database columns used for filtering and sorting (`created_at`, `prediction`, `redacted_url`) for fast pagination.

### 3.3 Reliability & Maintainability (`NFR-MAINT`)
- **NFR-MAINT-01:** Maintain 100% parity between training and inference feature extraction by using a single shared Python implementation tested with automated unit tests.
- **NFR-MAINT-02:** Enforce strict TypeScript typing (`strict: true`) on the frontend and Python type annotations + Pydantic v2 schemas on the backend.

### 3.4 Accessibility & Responsiveness (`NFR-UX`)
- **NFR-UX-01:** Support viewport widths from `320px` (mobile) to `768px` (tablet) and `1440px+` (desktop) without horizontal overflow.
- **NFR-UX-02:** Use semantic HTML, ARIA attributes, keyboard focus states, and accessible color contrast ratios alongside text badges and icons (not color alone) for Phishing (Red), Suspicious (Amber), and Legitimate (Green) verdicts.
