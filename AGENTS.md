# AGENTS.md — PhishGuard AI Engineering & Agent Guidelines

## 1. Project Identity
- **Project Name:** PhishGuard AI
- **Full Title:** An Intelligent Machine Learning-Based Phishing URL Detection System
- **Tagline:** *"Detect Threats. Protect Your Digital World."*
- **Core Principle:** PhishGuard AI is a **real, functional machine learning web application** that performs static lexical and structural analysis on submitted URLs. It must never use hardcoded predictions, fake frontend engines, or invented evaluation statistics, and it must **never automatically visit, fetch, or execute submitted URLs**.

---

## 2. Non-Negotiable Engineering Rules

1. **Real Machine Learning Only:**
   - All predictions must come from a genuinely trained and serialized ML model loaded by the FastAPI backend.
   - Never hardcode predictions, confidence scores, dashboard metrics, or evaluation metrics.
   - Never silently synthesize fake training datasets and present them as real-world data.
2. **Zero Training–Serving Skew:**
   - The exact same Python feature extraction module (`backend/app/services/feature_extraction.py`) must be used during dataset feature preparation, model training, evaluation, and production API inference.
   - Do not assume `https://` implies legitimacy; modern phishing campaigns frequently use valid TLS certificates.
3. **Strict Passive URL Analysis (No Active Fetching):**
   - The backend and frontend must **never** issue outbound HTTP/HTTPS/DNS/socket requests to a user-submitted URL.
   - Feature extraction must operate purely in-memory on the parsed URL string.
4. **Privacy-Preserving Persistence:**
   - Before storing a scanned URL in the database (`scan_history`), redact sensitive query parameter values (e.g., tokens, session IDs, emails, passwords, or arbitrary query values) while preserving structural feature counts computed in memory.
5. **Honest Reporting & Calibrated Language:**
   - Do not present model probabilities as guaranteed proof that a website is safe or malicious.
   - Always surface the disclaimer: *"Machine learning predictions are estimates and cannot guarantee that a URL is safe."*
   - Do not claim that global feature importance or heuristic signal indicators prove causal reasoning for an individual prediction.
6. **Clean Architecture & Separation of Concerns:**
   - **Backend:** FastAPI route handlers (`api/routes/`) validate requests and delegate business logic to `services/` and `ml/`, persisting state via SQLAlchemy repositories/models (`database/`).
   - **Frontend:** React + TypeScript components (`components/`, `pages/`) consume typed API services (`services/`) and custom hooks (`hooks/`). No business or prediction logic in UI components.
7. **Security First:**
   - Validate URL length (max 2048 characters), allowed schemes (`http`, `https`), and structural parseability via Pydantic.
   - Enforce rate limiting on public scanning endpoints.
   - Configure explicit CORS origins via environment variables.
   - Never log raw sensitive query strings or expose stack traces/secrets in API responses.

---

## 3. Repository Structure Standard

```text
PhishGuard AI/
├── AGENTS.md
├── README.md
├── docs/
│   ├── PROJECT_PROPOSAL.md
│   ├── REQUIREMENTS.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── DATABASE_DESIGN.md
│   ├── DATASET_CARD.md
│   ├── ML_DEVELOPMENT_PLAN.md
│   ├── MODEL_EVALUATION.md
│   ├── API_DOCUMENTATION.md
│   ├── TESTING_STRATEGY.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── SECURITY_AND_PRIVACY.md
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── scan.py
│   │   │       ├── history.py
│   │   │       ├── analytics.py
│   │   │       └── model.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── services/
│   │   │   ├── prediction_service.py
│   │   │   └── feature_extraction.py
│   │   ├── ml/
│   │   │   ├── artifacts/
│   │   │   ├── model_loader.py
│   │   │   ├── preprocessing.py
│   │   │   └── train.py
│   │   ├── database/
│   │   │   ├── connection.py
│   │   │   ├── models.py
│   │   │   └── schemas.py
│   │   └── utils/
│   │       └── url_sanitizer.py
│   ├── alembic/
│   ├── data/
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── layouts/
    │   ├── hooks/
    │   ├── services/
    │   ├── types/
    │   ├── utils/
    │   ├── contexts/
    │   ├── assets/
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    ├── vercel.json
    └── .env.example
```

---

## 4. Phased Development Workflow

Work strictly through the 6 structured phases. At the end of each phase, verify all deliverables and provide a formal phase completion report:

- **PHASE 1 – Project Planning:** Workspace inspection, proposal, requirements, system architecture, database design, ML development plan, dataset card template, and `AGENTS.md`.
- **PHASE 2 – Dataset Research & Machine Learning:** Obtain and verify a real labelled raw-URL dataset, document provenance in `docs/DATASET_CARD.md`, implement `feature_extraction.py`, preprocess without leakage, train/tune candidate models (Logistic Regression, Decision Tree, Random Forest, XGBoost), evaluate on held-out test sets (including domain-aware split evaluation), serialize versioned artifacts, and document real findings in `docs/MODEL_EVALUATION.md`.
- **PHASE 3 – Backend Development:** Implement modular FastAPI application, SQLAlchemy models + Alembic migrations, real ML model loader & prediction service, URL validation & query redaction, rate limiting, CORS, and comprehensive `pytest` suite.
- **PHASE 4 – Frontend Development:** Build the cybersecurity SaaS interface with React, TypeScript, Vite, Tailwind CSS, shadcn/ui patterns, Lucide icons, Framer Motion, and Recharts. Connect all views (Landing, URL Scanner, Scan Results, Analytics Dashboard, Scan History, Model Insights, About) to the live FastAPI backend.
- **PHASE 5 – Testing & Quality Assurance:** Run full backend (`pytest`), ML parity, and frontend (`vitest`) test suites; verify empty states, error handling, accessibility, responsiveness, and security controls.
- **PHASE 6 – Deployment & Final Documentation:** Prepare and verify Vercel (`frontend`) and Render + PostgreSQL (`backend`) deployment configurations, finalize `API_DOCUMENTATION.md`, `TESTING_STRATEGY.md`, `DEPLOYMENT_GUIDE.md`, and `SECURITY_AND_PRIVACY.md`.
