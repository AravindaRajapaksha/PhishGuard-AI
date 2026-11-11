# PhishGuard AI — Machine Learning Pipeline (`ml/`)

This directory provides the top-level machine learning research, training, and evaluation entry points for **PhishGuard AI**.

## Shared Training–Serving Feature Architecture

To guarantee **zero training–serving skew**, both offline training (`ml/train_pipeline.py` & `backend/app/ml/train.py`) and live FastAPI inference (`backend/app/services/prediction_service.py`) import the exact same 24-feature extraction implementation in [`backend/app/services/feature_extraction.py`](../backend/app/services/feature_extraction.py).

## Running the Training Pipeline

From the repository root on Windows 11 PowerShell:

```powershell
.\backend\.venv\Scripts\python.exe ml/train_pipeline.py
```

## Active Production Artifact (`v1.0.0`)

- **Selected Classifier:** `XGBoost` (`n_estimators=300, max_depth=6, learning_rate=0.1, subsample=0.85, colsample_bytree=0.85`)
- **Held-Out Test Accuracy:** `90.70%`
- **Held-Out Test F1-Score:** `90.72%`
- **Held-Out Test ROC-AUC:** `96.74%`
- **Zero-Overlap Domain-Grouped ROC-AUC:** `96.27%` (`1,777` unseen registrable domains)

See [`../docs/MODEL_EVALUATION.md`](../docs/MODEL_EVALUATION.md) for the complete evaluation report.
