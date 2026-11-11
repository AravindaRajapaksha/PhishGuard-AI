# PhishGuard AI

**An Intelligent Machine Learning-Based Phishing URL Detection System**  
*"Detect Threats. Protect Your Digital World."*

---

## 1. Overview

**PhishGuard AI** is a full-stack cybersecurity web application that uses supervised machine learning (**XGBoost `v1.0.0`**) to identify potentially malicious and phishing URLs through strictly passive lexical and structural analysis.

Users can submit any `http://` or `https://` URL for analysis. The system extracts **24 lexical and structural features** in memory, evaluates them using a trained classification model, and returns a three-tier verdict (**Legitimate**, **Suspicious / Uncertain**, or **Phishing**) alongside human-understandable risk signal explanations, transparent model evaluation statistics, an interactive analytics dashboard, and a privacy-redacted scan history log.

> **Security & Privacy Guarantee:** PhishGuard AI performs strictly passive URL string analysis. It **never** visits, fetches, resolves via DNS, or executes submitted URLs, and it automatically redacts query parameter values (`?token=[REDACTED]`) before storing scan records.

---

## 2. Repository Structure

```text
PhishGuard AI/
├── frontend/                  # React 18 + TypeScript + Vite + Tailwind CSS + Recharts SPA
│   ├── src/
│   │   ├── components/        # Reusable UI (Button, Card, Badge) & Scanner/Result views
│   │   ├── contexts/          # ThemeContext (Dark/Light) & ToastContext
│   │   ├── layouts/           # Responsive cybersecurity navbar, mobile drawer & footer
│   │   ├── pages/             # Landing, Scanner, History, Analytics, Model Insights, About
│   │   ├── services/          # Typed REST API client (phishGuardApi)
│   │   ├── test/              # Vitest + React Testing Library test suite
│   │   ├── types/             # Strict TypeScript interfaces matching FastAPI schemas
│   │   └── utils/             # URL validator, safe example presets & class utilities
│   ├── public/                # Static assets
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.ts
├── backend/                   # Python 3.12 + FastAPI + SQLAlchemy 2.0 + Alembic Backend
│   ├── app/
│   │   ├── api/routes/        # /api/v1/scan, /history, /analytics/overview, /model/info
│   │   ├── core/              # Settings (config.py) & sliding-window IP rate limiter
│   │   ├── database/          # SQLAlchemy ORM models, session management & Pydantic schemas
│   │   ├── ml/                # Model training, preprocessing & versioned artifact loader
│   │   ├── services/          # Shared 24-feature extractor & prediction service
│   │   ├── utils/             # Passive URL validator & query parameter redactor
│   │   └── main.py            # FastAPI application entry point
│   ├── alembic/               # Database schema migrations
│   ├── tests/                 # Pytest suite (URL validation, features, ML parity, API)
│   ├── Dockerfile
│   └── requirements.txt
├── ml/                        # Top-level ML training runner & evaluation summary export
├── datasets/                  # Dataset documentation & benchmark sample (CC BY 4.0)
├── docs/                      # Complete engineering, architecture, ML & deployment docs
├── AGENTS.md
└── README.md
```

---

## 3. Verified Machine Learning Performance (`v1.0.0`)

Trained and evaluated on **14,411 cleaned, deduplicated raw URLs** (`7,214` legitimate, `7,197` phishing across `8,884` unique registrable domains) licensed under **CC BY 4.0** (*Hannousse & Yahiouche, 2021* + *UCI PhiUSIIL, 2024* root supplement):

| Model | Held-Out Test Accuracy | Precision | Recall | F1-Score | ROC-AUC | PR-AUC | Status |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| **XGBoost (`v1.0.0`)** | **90.70%** | **90.35%** | **91.10%** | **90.72%** | **96.74%** | **96.77%** | **Active Production** |
| **Random Forest** | 90.01% | 88.91% | 91.38% | 90.13% | 96.55% | 96.56% | Benchmarked |
| **Decision Tree** | 85.99% | 87.82% | 83.50% | 85.61% | 92.56% | 91.19% | Benchmarked |
| **Logistic Regression** | 81.17% | 84.01% | 76.92% | 80.31% | 90.50% | 91.20% | Benchmarked |

- **Zero-Overlap Domain-Grouped Generalization (`GroupShuffleSplit`):** `90.19%` Accuracy and `96.27%` ROC-AUC across `1,777` completely unseen registrable domains.

---

## 4. Exact Windows 11 Installation & Execution Commands

### 4.1 Backend Setup & Startup (PowerShell Terminal 1)

```powershell
# 1. Navigate to the backend directory
cd "d:\Shehan-projects\PhishGuard AI\backend"

# 2. Create and populate the Python virtual environment
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# 3. Copy default environment configuration (uses SQLite out-of-the-box or PostgreSQL)
Copy-Item .env.example .env -ErrorAction SilentlyContinue

# 4. Run Alembic database migrations
.\.venv\Scripts\alembic.exe upgrade head

# 5. (Optional) Re-run the ML training pipeline from scratch
.\.venv\Scripts\python.exe -m app.ml.train

# 6. Start the FastAPI server on http://localhost:8000
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **API Root:** `http://localhost:8000/`
- **Swagger UI:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/api/v1/health`

### 4.2 Frontend Setup & Startup (PowerShell Terminal 2)

```powershell
# 1. Navigate to the frontend directory
cd "d:\Shehan-projects\PhishGuard AI\frontend"

# 2. Install Node.js packages
npm install

# 3. Copy default environment configuration
Copy-Item .env.example .env -ErrorAction SilentlyContinue

# 4. Start the Vite development server on http://localhost:5173
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 5. Running the Automated Test Suites

```powershell
# Run Backend & ML Pytest Suite (21 passed)
cd "d:\Shehan-projects\PhishGuard AI\backend"
.\.venv\Scripts\python.exe -m pytest -v

# Run Frontend TypeScript Compiler, Vitest Suite (7 passed) & Production Build
cd "d:\Shehan-projects\PhishGuard AI\frontend"
npm run lint
npm test
npm run build
```

---

## 6. Documentation Index

- [Engineering & Agent Guidelines (`AGENTS.md`)](./AGENTS.md)
- [Project Proposal (`docs/PROJECT_PROPOSAL.md`)](./docs/PROJECT_PROPOSAL.md)
- [System Requirements Specification (`docs/REQUIREMENTS.md`)](./docs/REQUIREMENTS.md)
- [System Architecture (`docs/SYSTEM_ARCHITECTURE.md`)](./docs/SYSTEM_ARCHITECTURE.md)
- [Database Design (`docs/DATABASE_DESIGN.md`)](./docs/DATABASE_DESIGN.md)
- [Dataset Card (`docs/DATASET_CARD.md`)](./docs/DATASET_CARD.md)
- [Machine Learning Development Plan (`docs/ML_DEVELOPMENT_PLAN.md`)](./docs/ML_DEVELOPMENT_PLAN.md)
- [Model Evaluation Report (`docs/MODEL_EVALUATION.md`)](./docs/MODEL_EVALUATION.md)
- [REST API Documentation (`docs/API_DOCUMENTATION.md`)](./docs/API_DOCUMENTATION.md)
- [Testing Strategy & Verification (`docs/TESTING_STRATEGY.md`)](./docs/TESTING_STRATEGY.md)
- [Deployment Guide (`docs/DEPLOYMENT_GUIDE.md`)](./docs/DEPLOYMENT_GUIDE.md)
- [Security & Privacy Architecture (`docs/SECURITY_AND_PRIVACY.md`)](./docs/SECURITY_AND_PRIVACY.md)
