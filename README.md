# PhishGuard AI

**An Intelligent Machine Learning-Based Phishing URL Detection System**  
*"Detect Threats. Protect Your Digital World."*

---

## Overview

**PhishGuard AI** is a full-stack cybersecurity web application that uses supervised machine learning to identify potentially malicious and phishing URLs through passive lexical and structural analysis.

Users can submit any `http://` or `https://` URL for analysis. The system extracts 24 lexical and structural features in memory, evaluates them using a trained classification model, and returns a transparent classification (**Legitimate**, **Suspicious / Uncertain**, or **Phishing**) alongside human-readable risk indicators, model evaluation insights, and privacy-redacted scan history.

> **Safety & Privacy Guarantee:** PhishGuard AI performs strictly passive URL string analysis. It **never** visits, fetches, resolves, or executes submitted URLs, and it automatically redacts query parameter values before storing scan history.

---

## Development Status

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1** | Project Planning, Architecture, Database & ML Specification | **Completed** |
| **Phase 2** | Dataset Acquisition, Feature Engineering, Model Training & Evaluation | *Next Up* |
| **Phase 3** | FastAPI Backend, SQLAlchemy/PostgreSQL & REST API Implementation | *Pending* |
| **Phase 4** | React + TypeScript Cybersecurity SaaS Frontend & API Integration | *Pending* |
| **Phase 5** | Automated Testing, QA, Accessibility & Security Verification | *Pending* |
| **Phase 6** | Vercel + Render + PostgreSQL Deployment Configuration & Final Docs | *Pending* |

---

## Documentation Index

- [Engineering & Agent Guidelines (`AGENTS.md`)](./AGENTS.md)
- [Project Proposal (`docs/PROJECT_PROPOSAL.md`)](./docs/PROJECT_PROPOSAL.md)
- [System Requirements Specification (`docs/REQUIREMENTS.md`)](./docs/REQUIREMENTS.md)
- [System Architecture (`docs/SYSTEM_ARCHITECTURE.md`)](./docs/SYSTEM_ARCHITECTURE.md)
- [Database Design (`docs/DATABASE_DESIGN.md`)](./docs/DATABASE_DESIGN.md)
- [Machine Learning Development Plan (`docs/ML_DEVELOPMENT_PLAN.md`)](./docs/ML_DEVELOPMENT_PLAN.md)
- [Dataset Card Template (`docs/DATASET_CARD.md`)](./docs/DATASET_CARD.md)
