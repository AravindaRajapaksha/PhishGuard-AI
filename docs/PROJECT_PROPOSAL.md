# Project Proposal: PhishGuard AI

**Full Project Title:** An Intelligent Machine Learning-Based Phishing URL Detection System  
**Project Name:** PhishGuard AI  
**Tagline:** *"Detect Threats. Protect Your Digital World."*  
**Document Version:** 1.0.0  
**Status:** Phase 1 – Approved for Engineering  

---

## 1. Executive Summary

Phishing remains one of the most prevalent and damaging attack vectors in modern cybersecurity. Attackers continuously register ephemeral domains, craft deceptive URL structures, abuse free TLS certificates, and employ homograph or subdomain obfuscation techniques to bypass static blocklists.

**PhishGuard AI** is a full-stack, machine learning-powered web application that analyzes submitted URLs using lexical and structural characteristics to estimate whether a link is **Legitimate**, **Suspicious / Uncertain**, or **Phishing**. Unlike traditional reputation lookups that fail on zero-hour domains—or active sandboxes that risk exposing user endpoints or triggering attacker beacons—PhishGuard AI performs **strictly passive, in-memory URL analysis** without ever visiting, resolving, or executing the submitted URL.

In addition to real-time URL classification, PhishGuard AI provides human-understandable risk signal explanations, transparent machine learning performance metrics from unseen test evaluations, a privacy-conscious scan history repository, and an interactive cybersecurity analytics dashboard.

---

## 2. Problem Statement

1. **Ephemeral Phishing Infrastructure:** Modern phishing kits deploy thousands of short-lived URLs that evade traditional signature and blocklist databases during the critical first hours of an attack campaign.
2. **Opaque Detection Tools:** Many security scanners return a binary verdict without explaining *why* a URL was flagged, preventing users and junior analysts from learning to recognize structural indicators of deception.
3. **Privacy and Operational Risk of Active Scanning:** Automatically crawling or fetching a submitted URL can inadvertently validate victim tracking tokens, leak confidential query parameters, or expose the scanning infrastructure to Server-Side Request Forgery (SSRF) and drive-by payloads.
4. **Misleading Security Indicators:** End users frequently equate `https://` with trustworthiness, even though the vast majority of modern phishing sites use valid TLS certificates.

---

## 3. Project Objectives

PhishGuard AI is designed to achieve ten core objectives:

1. **Real Machine Learning Detection:** Train, validate, compare, and deploy a genuine supervised classification model on verified real-world phishing and legitimate URLs.
2. **Accurate Multi-Tier Classification:** Distinguish between **Phishing**, **Legitimate**, and **Suspicious / Uncertain** URLs using a transparent probability decision policy optimized to minimize false negatives while controlling false positives.
3. **Lexical & Structural Feature Engineering:** Extract 20+ deterministic lexical and structural features (lengths, character distributions, subdomain depth, entropy, IP hostnames, punycode, suspicious tokens, and query complexity) with guaranteed parity between training and inference.
4. **Explainable Predictions:** Present clear, non-deceptive explanations of the specific lexical signals found in each scanned URL alongside global model feature importance.
5. **Transparent Model Insights:** Display authentic evaluation metrics—Accuracy, Precision, Recall, F1-Score, ROC-AUC, PR-AUC, and Confusion Matrix—computed on held-out test datasets.
6. **Privacy-Conscious Scan History:** Persist historical scans in PostgreSQL with automatic redaction of sensitive URL query parameter values, full search/filter/pagination support, and record deletion controls.
7. **Cybersecurity Analytics Dashboard:** Visualize real scan telemetry (classification breakdowns, timeline trends, risk distributions) using live database queries and proper empty states when no scans exist.
8. **Modern Cybersecurity SaaS UI/UX:** Deliver a responsive, accessible dark-first interface built with React, TypeScript, Tailwind CSS, Lucide icons, Framer Motion, and Recharts.
9. **Secure Modular Architecture:** Separate concerns across a FastAPI backend, scikit-learn/XGBoost ML pipeline, SQLAlchemy/Alembic persistence layer, and typed React frontend protected by strict input validation, CORS controls, and rate limiting.
10. **Cloud Deployment Readiness:** Package the application for production deployment using Vercel (frontend), Render (Dockerized FastAPI backend), and managed PostgreSQL.

---

## 4. Project Scope

### 4.1 In-Scope
- Acquisition, verification, cleaning, and documentation of a real raw-URL dataset containing phishing and legitimate URLs.
- Development of a deterministic Python URL feature extraction module shared across training and production inference.
- Training, hyperparameter tuning, and evaluation of multiple classifiers (Logistic Regression, Decision Tree, Random Forest, XGBoost).
- Serialization of the selected model, preprocessing pipeline, feature schema, and evaluation metadata into a versioned artifact directory.
- RESTful API built with FastAPI (`/api/v1/scan`, `/api/v1/history`, `/api/v1/analytics/overview`, `/api/v1/model/info`, `/api/v1/health`).
- PostgreSQL database schema (`scan_history`, `model_versions`) managed via SQLAlchemy and Alembic migrations.
- Complete responsive React + TypeScript frontend featuring:
  - Landing Page with integrated hero scanner and real model evaluation preview.
  - Dedicated URL Scanner Page with safe example URLs and live validation.
  - Detailed Scan Results view with feature breakdown, risk indicators, and safety disclaimers.
  - Analytics Dashboard powered by live database records.
  - Scan History manager with search, prediction filter, date filter, pagination, detail view, single delete, and clear history.
  - Model Insights page detailing architecture, dataset provenance, confusion matrix, and feature importances.
  - About / Security & Privacy page explaining system capabilities and boundaries.

### 4.2 Out-of-Scope (By Design)
- **Active URL Fetching / Crawling:** The system will **never** make HTTP requests, DNS lookups, WHOIS queries, or headless browser visits to submitted URLs.
- **Page Content / DOM Inspection:** Analysis is strictly lexical and structural based on the URL string itself.
- **Guaranteed Safety Certification:** The system explicitly informs users that machine learning predictions are statistical estimates and cannot guarantee a website is safe.

---

## 5. Target Users

1. **Everyday Internet Users:** Individuals who want a fast, privacy-respecting second opinion on suspicious links received via email, SMS, or messaging platforms.
2. **SOC Analysts & Cybersecurity Students:** Practitioners and learners examining how lexical URL features and supervised machine learning models classify phishing links.
3. **Software & ML Engineering Evaluators:** Reviewers assessing end-to-end ML system design, training-serving parity, API security, and full-stack software craftsmanship.

---

## 6. Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Data Leakage Across Splits** | Overstated test accuracy due to duplicate URLs or shared domains in train and test sets | Medium | Deduplicate canonical URLs before splitting; perform both stratified random splitting and domain-grouped evaluation to measure true generalization. |
| **Training–Serving Feature Skew** | Production predictions diverge from offline evaluation | Medium | Encapsulate all feature logic in a single module (`feature_extraction.py`) imported by both the training script and FastAPI service, verified by automated parity tests. |
| **Privacy Leakage in Stored URLs** | Users submit URLs containing OAuth codes, session tokens, or personal emails in query strings | High | Implement `url_sanitizer.py` to redact query parameter values (`?token=[REDACTED]`) prior to database persistence while extracting structural metrics in memory. |
| **Over-Reliance on Model Confidence** | User visits a live phishing site because the model predicted "Legitimate" (False Negative) | Medium | Introduce a calibrated "Suspicious / Uncertain" zone for borderline probabilities and display mandatory warning banners on every scan result. |
| **SSRF / Malicious Payload Execution** | Attacker submits internal IP or exploit URL hoping the backend will fetch it | High | Enforce strict passive string parsing (`urllib.parse`) with zero network calls on submitted URLs. |

---

## 7. Phased Delivery Roadmap

| Phase | Title | Key Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Project Planning & Architecture** | `AGENTS.md`, `PROJECT_PROPOSAL.md`, `REQUIREMENTS.md`, `SYSTEM_ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `ML_DEVELOPMENT_PLAN.md`, `DATASET_CARD.md` |
| **Phase 2** | **Dataset Research & ML Pipeline** | Verified raw-URL dataset, `feature_extraction.py`, model training & comparison pipeline, versioned artifacts (`v1`), `MODEL_EVALUATION.md`, ML unit tests |
| **Phase 3** | **Backend Development** | FastAPI app, SQLAlchemy models, Alembic migrations, rate limiting, URL redaction, `/api/v1/*` endpoints, `pytest` test suite |
| **Phase 4** | **Frontend Development** | Design system, Navigation, Landing Page, URL Scanner, Scan Results, Analytics Dashboard, Scan History, Model Insights, About page |
| **Phase 5** | **Testing & Quality Assurance** | End-to-end integration verification, frontend `vitest` suite, accessibility & responsiveness audit, security review |
| **Phase 6** | **Deployment & Documentation** | `Dockerfile`, `vercel.json`, `.env.example` files, `API_DOCUMENTATION.md`, `TESTING_STRATEGY.md`, `DEPLOYMENT_GUIDE.md`, `SECURITY_AND_PRIVACY.md` |
