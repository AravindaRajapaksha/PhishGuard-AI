"""Reproducible machine learning training, hyperparameter tuning, and evaluation pipeline.

Trains and compares four supervised classifiers on real raw URLs:
1. Logistic Regression (with StandardScaler fit strictly on training data)
2. Decision Tree Classifier
3. Random Forest Classifier
4. XGBoost Classifier

Evaluates candidate models on:
- Held-out stratified test split (15% unseen data)
- Registrable-domain-grouped split (GroupShuffleSplit with zero domain overlap)

Serializes the winning model and comprehensive metadata to `backend/app/ml/artifacts/v1/`.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier

from app.ml.model_loader import ARTIFACTS_BASE_DIR, DEFAULT_MODEL_VERSION
from app.ml.preprocessing import (
    build_feature_matrix,
    clean_and_deduplicate_dataset,
    split_dataset_domain_grouped,
    split_dataset_stratified,
)
from app.services.feature_extraction import FEATURE_METADATA, FEATURE_NAMES

RAW_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "raw"
RANDOM_SEED = 42


def load_combined_raw_corpus() -> pd.DataFrame:
    """Load and standardize the verified CC BY 4.0 raw URL datasets.

    Sources:
    1. Hannousse & Yahiouche (2021) Phishing URL Benchmark Dataset (11,430 raw URLs, CC BY 4.0)
       - Contains balanced legitimate (5,715) and phishing (5,715) URLs across both root
         domains and deep subpages.
    2. UCI PhiUSIIL Phishing URL Dataset (Prasad & Chandra, 2024, CC BY 4.0)
       - Stratified path-matched root-domain supplement (1,500 legitimate root URLs and
         1,500 phishing root URLs, both with empty paths so zero path-length bias is introduced).
    """
    hannousse_csv = RAW_DATA_DIR / "hannousse_2021_phishing_urls.csv"
    phiusiil_csv = RAW_DATA_DIR / "PhiUSIIL_Phishing_URL_Dataset.csv"

    if not hannousse_csv.exists():
        raise FileNotFoundError(
            f"Expected dataset file not found at {hannousse_csv}."
        )

    df_h = pd.read_csv(hannousse_csv, usecols=["url", "status"])
    df_h["label"] = df_h["status"].map(
        lambda s: 1 if str(s).strip().lower() == "phishing" else 0
    )
    df_h = df_h[["url", "label"]].copy()
    df_h["source"] = "Hannousse_Yahiouche_2021"

    frames = [df_h]

    if phiusiil_csv.exists():
        df_p = pd.read_csv(phiusiil_csv, usecols=["URL", "label"])
        df_p = df_p.rename(columns={"URL": "url"})
        # In raw PhiUSIIL, label=1 is Legitimate and label=0 is Phishing.
        # Map to standard PhishGuard AI convention: 0 = Legitimate, 1 = Phishing.
        df_p["label"] = df_p["label"].map(lambda x: 0 if int(x) == 1 else 1)

        # Select path-matched root URLs (no path after hostname) from both classes
        # to enrich modern TLD coverage (.xyz, .top, .gq, .ru, .cf) without path bias.
        def _is_root_url(u: str) -> bool:
            s = str(u).strip()
            idx = s.find("://")
            rest = s[idx + 3 :] if idx != -1 else s
            slash_idx = rest.find("/")
            return slash_idx == -1 or rest[slash_idx:] == "/"

        root_mask = df_p["url"].map(_is_root_url)
        df_p_root = df_p.loc[root_mask].copy()

        legit_sample = df_p_root[df_p_root["label"] == 0].sample(
            n=1500, random_state=RANDOM_SEED
        )
        phish_sample = df_p_root[df_p_root["label"] == 1].sample(
            n=1500, random_state=RANDOM_SEED
        )
        df_p_supp = pd.concat([legit_sample, phish_sample], ignore_index=True)
        df_p_supp["source"] = "UCI_PhiUSIIL_2024_Root_Supplement"
        frames.append(df_p_supp[["url", "label", "source"]])

    combined = pd.concat(frames, ignore_index=True)
    return combined


def evaluate_predictions(
    y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray
) -> dict[str, Any]:
    """Compute comprehensive binary classification metrics for phishing detection."""
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_true, y_proba))
    pr_auc = float(average_precision_score(y_true, y_proba))

    fpr = float(fp / max(fp + tn, 1))
    fnr = float(fn / max(fn + tp, 1))

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "confusion_matrix": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp),
            "false_positive_rate": round(fpr, 4),
            "false_negative_rate": round(fnr, 4),
        },
    }


def extract_feature_importances(
    model: Any, scaler: StandardScaler | None = None
) -> list[dict[str, Any]]:
    """Extract normalized global feature importances from a trained classifier."""
    if hasattr(model, "feature_importances_"):
        raw_imp = np.asarray(model.feature_importances_, dtype=float)
    elif hasattr(model, "coef_"):
        raw_imp = np.abs(np.asarray(model.coef_[0], dtype=float))
    else:
        raw_imp = np.ones(len(FEATURE_NAMES), dtype=float)

    total = float(raw_imp.sum()) or 1.0
    normalized = raw_imp / total

    items = []
    for name, val in zip(FEATURE_NAMES, normalized):
        items.append(
            {
                "feature": name,
                "label": FEATURE_METADATA[name]["label"],
                "category": FEATURE_METADATA[name]["category"],
                "importance": round(float(val), 4),
                "description": FEATURE_METADATA[name]["description"],
            }
        )
    items.sort(key=lambda x: x["importance"], reverse=True)
    return items


def run_training_pipeline(version: str = DEFAULT_MODEL_VERSION) -> dict[str, Any]:
    """Execute end-to-end dataset cleaning, feature extraction, model training, and artifact saving."""
    print("[1/6] Loading and cleaning raw URL corpus...")
    raw_df = load_combined_raw_corpus()
    cleaned_df, audit_stats = clean_and_deduplicate_dataset(
        raw_df, url_col="url", label_col="label"
    )

    print("[2/6] Performing 70/15/15 stratified train/validation/test split...")
    train_df, val_df, test_df = split_dataset_stratified(
        cleaned_df,
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15,
        random_state=RANDOM_SEED,
    )
    audit_stats.train_records = len(train_df)
    audit_stats.validation_records = len(val_df)
    audit_stats.test_records = len(test_df)

    print(
        f"      Cleaned total={audit_stats.final_cleaned_records} "
        f"(Legit={audit_stats.legitimate_count}, Phish={audit_stats.phishing_count}) | "
        f"Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}"
    )

    print("[3/6] Extracting 24 lexical and structural features across splits...")
    X_train = build_feature_matrix(train_df["url"])
    y_train = train_df["label"].to_numpy(dtype=int)

    X_val = build_feature_matrix(val_df["url"])
    y_val = val_df["label"].to_numpy(dtype=int)

    X_test = build_feature_matrix(test_df["url"])
    y_test = test_df["label"].to_numpy(dtype=int)

    # Fit StandardScaler ONLY on training split (used by Logistic Regression)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    print("[4/6] Training and tuning candidate classification models...")
    candidates: list[dict[str, Any]] = []

    # 1. Logistic Regression (tune C on validation set)
    best_lr = None
    best_lr_val_f1 = -1.0
    best_lr_params: dict[str, Any] = {}
    for c_val in [0.1, 1.0, 5.0, 10.0]:
        lr = LogisticRegression(
            C=c_val, max_iter=1000, random_state=RANDOM_SEED
        )
        lr.fit(X_train_scaled, y_train)
        val_pred = lr.predict(X_val_scaled)
        val_f1 = float(f1_score(y_val, val_pred))
        if val_f1 > best_lr_val_f1:
            best_lr_val_f1 = val_f1
            best_lr = lr
            best_lr_params = {"C": c_val, "max_iter": 1000, "scaled": True}

    assert best_lr is not None
    lr_val_proba = best_lr.predict_proba(X_val_scaled)[:, 1]
    lr_test_pred = best_lr.predict(X_test_scaled)
    lr_test_proba = best_lr.predict_proba(X_test_scaled)[:, 1]
    candidates.append(
        {
            "key": "logistic_regression",
            "name": "Logistic Regression",
            "estimator": best_lr,
            "uses_scaler": True,
            "hyperparameters": best_lr_params,
            "validation_metrics": evaluate_predictions(
                y_val, best_lr.predict(X_val_scaled), lr_val_proba
            ),
            "test_metrics": evaluate_predictions(y_test, lr_test_pred, lr_test_proba),
        }
    )

    # 2. Decision Tree (tune max_depth and min_samples_leaf on validation set)
    best_dt = None
    best_dt_val_f1 = -1.0
    best_dt_params: dict[str, Any] = {}
    for depth in [8, 12, 16]:
        for min_leaf in [5, 10, 20]:
            dt = DecisionTreeClassifier(
                max_depth=depth,
                min_samples_leaf=min_leaf,
                random_state=RANDOM_SEED,
            )
            dt.fit(X_train, y_train)
            val_pred = dt.predict(X_val)
            val_f1 = float(f1_score(y_val, val_pred))
            if val_f1 > best_dt_val_f1:
                best_dt_val_f1 = val_f1
                best_dt = dt
                best_dt_params = {"max_depth": depth, "min_samples_leaf": min_leaf}

    assert best_dt is not None
    dt_val_proba = best_dt.predict_proba(X_val)[:, 1]
    dt_test_pred = best_dt.predict(X_test)
    dt_test_proba = best_dt.predict_proba(X_test)[:, 1]
    candidates.append(
        {
            "key": "decision_tree",
            "name": "Decision Tree",
            "estimator": best_dt,
            "uses_scaler": False,
            "hyperparameters": best_dt_params,
            "validation_metrics": evaluate_predictions(
                y_val, best_dt.predict(X_val), dt_val_proba
            ),
            "test_metrics": evaluate_predictions(y_test, dt_test_pred, dt_test_proba),
        }
    )

    # 3. Random Forest (tune max_depth and min_samples_leaf on validation set)
    best_rf = None
    best_rf_val_f1 = -1.0
    best_rf_params: dict[str, Any] = {}
    for n_est in [200, 300]:
        for depth in [18, 24, None]:
            rf = RandomForestClassifier(
                n_estimators=n_est,
                max_depth=depth,
                min_samples_leaf=2,
                n_jobs=-1,
                random_state=RANDOM_SEED,
            )
            rf.fit(X_train, y_train)
            val_pred = rf.predict(X_val)
            val_f1 = float(f1_score(y_val, val_pred))
            if val_f1 > best_rf_val_f1:
                best_rf_val_f1 = val_f1
                best_rf = rf
                best_rf_params = {
                    "n_estimators": n_est,
                    "max_depth": depth,
                    "min_samples_leaf": 2,
                }

    assert best_rf is not None
    rf_val_proba = best_rf.predict_proba(X_val)[:, 1]
    rf_test_pred = best_rf.predict(X_test)
    rf_test_proba = best_rf.predict_proba(X_test)[:, 1]
    candidates.append(
        {
            "key": "random_forest",
            "name": "Random Forest",
            "estimator": best_rf,
            "uses_scaler": False,
            "hyperparameters": best_rf_params,
            "validation_metrics": evaluate_predictions(
                y_val, best_rf.predict(X_val), rf_val_proba
            ),
            "test_metrics": evaluate_predictions(y_test, rf_test_pred, rf_test_proba),
        }
    )

    # 4. XGBoost (tune max_depth and learning_rate on validation set)
    best_xgb = None
    best_xgb_val_f1 = -1.0
    best_xgb_params: dict[str, Any] = {}
    for depth in [6, 8]:
        for lr_rate in [0.05, 0.1]:
            xgb = XGBClassifier(
                n_estimators=300,
                max_depth=depth,
                learning_rate=lr_rate,
                subsample=0.85,
                colsample_bytree=0.85,
                eval_metric="logloss",
                random_state=RANDOM_SEED,
                n_jobs=-1,
            )
            xgb.fit(X_train, y_train)
            val_pred = xgb.predict(X_val)
            val_f1 = float(f1_score(y_val, val_pred))
            if val_f1 > best_xgb_val_f1:
                best_xgb_val_f1 = val_f1
                best_xgb = xgb
                best_xgb_params = {
                    "n_estimators": 300,
                    "max_depth": depth,
                    "learning_rate": lr_rate,
                    "subsample": 0.85,
                    "colsample_bytree": 0.85,
                }

    assert best_xgb is not None
    xgb_val_proba = best_xgb.predict_proba(X_val)[:, 1]
    xgb_test_pred = best_xgb.predict(X_test)
    xgb_test_proba = best_xgb.predict_proba(X_test)[:, 1]
    candidates.append(
        {
            "key": "xgboost",
            "name": "XGBoost",
            "estimator": best_xgb,
            "uses_scaler": False,
            "hyperparameters": best_xgb_params,
            "validation_metrics": evaluate_predictions(
                y_val, best_xgb.predict(X_val), xgb_val_proba
            ),
            "test_metrics": evaluate_predictions(y_test, xgb_test_pred, xgb_test_proba),
        }
    )

    # Select winning model strictly by validation F1-score (tie-break by validation Recall & ROC-AUC)
    candidates.sort(
        key=lambda c: (
            c["validation_metrics"]["f1_score"],
            c["validation_metrics"]["recall"],
            c["validation_metrics"]["roc_auc"],
        ),
        reverse=True,
    )
    winner = candidates[0]
    print(
        f"[5/6] Selected Winner: {winner['name']} "
        f"(Val F1={winner['validation_metrics']['f1_score']}, "
        f"Test F1={winner['test_metrics']['f1_score']}, "
        f"Test ROC-AUC={winner['test_metrics']['roc_auc']})"
    )

    # Evaluate domain-grouped generalization on the winning architecture
    print("      Running registrable-domain-grouped generalization evaluation...")
    dom_train_df, dom_test_df = split_dataset_domain_grouped(
        cleaned_df, test_size=0.20, random_state=RANDOM_SEED
    )
    X_dom_train = build_feature_matrix(dom_train_df["url"])
    y_dom_train = dom_train_df["label"].to_numpy(dtype=int)
    X_dom_test = build_feature_matrix(dom_test_df["url"])
    y_dom_test = dom_test_df["label"].to_numpy(dtype=int)

    if winner["key"] == "xgboost":
        dom_model = XGBClassifier(
            **winner["hyperparameters"],
            eval_metric="logloss",
            random_state=RANDOM_SEED,
            n_jobs=-1,
        )
        dom_model.fit(X_dom_train, y_dom_train)
        dom_pred = dom_model.predict(X_dom_test)
        dom_proba = dom_model.predict_proba(X_dom_test)[:, 1]
    elif winner["key"] == "random_forest":
        dom_model = RandomForestClassifier(
            **winner["hyperparameters"], n_jobs=-1, random_state=RANDOM_SEED
        )
        dom_model.fit(X_dom_train, y_dom_train)
        dom_pred = dom_model.predict(X_dom_test)
        dom_proba = dom_model.predict_proba(X_dom_test)[:, 1]
    else:
        dom_model = winner["estimator"]
        dom_pred = dom_model.predict(X_dom_test)
        dom_proba = dom_model.predict_proba(X_dom_test)[:, 1]

    domain_split_metrics = evaluate_predictions(y_dom_test, dom_pred, dom_proba)
    domain_split_metrics["train_domains"] = int(
        dom_train_df["registrable_domain"].nunique()
    )
    domain_split_metrics["test_domains"] = int(
        dom_test_df["registrable_domain"].nunique()
    )
    domain_split_metrics["domain_overlap_count"] = int(
        len(
            set(dom_train_df["registrable_domain"]).intersection(
                set(dom_test_df["registrable_domain"])
            )
        )
    )

    feature_importances = extract_feature_importances(winner["estimator"], scaler)

    # Serialize versioned artifacts
    print(f"[6/6] Saving versioned artifacts to {ARTIFACTS_BASE_DIR / version}...")
    artifact_dir = ARTIFACTS_BASE_DIR / version
    artifact_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(winner["estimator"], artifact_dir / "model.joblib")
    if winner["uses_scaler"]:
        joblib.dump(scaler, artifact_dir / "scaler.joblib")
    elif (artifact_dir / "scaler.joblib").exists():
        (artifact_dir / "scaler.joblib").unlink()

    trained_at_iso = datetime.now(timezone.utc).isoformat()
    candidate_comparison = [
        {
            "key": c["key"],
            "name": c["name"],
            "hyperparameters": c["hyperparameters"],
            "validation_metrics": c["validation_metrics"],
            "test_metrics": c["test_metrics"],
            "is_selected": c["key"] == winner["key"],
        }
        for c in candidates
    ]

    metadata: dict[str, Any] = {
        "version": "v1.0.0",
        "artifact_directory": version,
        "selected_model_key": winner["key"],
        "selected_model_name": winner["name"],
        "hyperparameters": winner["hyperparameters"],
        "trained_at": trained_at_iso,
        "dataset": {
            "name": "Hannousse & Yahiouche (2021) Phishing URL Benchmark + UCI PhiUSIIL (2024) Root Supplement",
            "license": "CC BY 4.0 (Creative Commons Attribution 4.0 International)",
            "sources": [
                "Hannousse & Yahiouche (2021), Engineering Applications of Artificial Intelligence, Vol. 104 (11,430 raw URLs, CC BY 4.0)",
                "Prasad & Chandra (2024), UCI Machine Learning Repository ID 967 — PhiUSIIL Phishing URL Dataset (3,000 path-matched root URLs, CC BY 4.0)",
            ],
            "audit": audit_stats.to_dict(),
        },
        "feature_count": len(FEATURE_NAMES),
        "feature_names": FEATURE_NAMES,
        "decision_thresholds": {
            "low": 0.35,
            "high": 0.65,
            "policy_description": (
                "Scores < 0.35 classify as 'legitimate'; scores in [0.35, 0.65) classify as "
                "'suspicious' (uncertain/borderline); scores >= 0.65 classify as 'phishing'."
            ),
        },
        "validation_metrics": winner["validation_metrics"],
        "test_metrics": winner["test_metrics"],
        "domain_grouped_test_metrics": domain_split_metrics,
        "candidate_models": candidate_comparison,
        "feature_importances": feature_importances,
    }

    with open(artifact_dir / "metadata.json", "w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=2)

    print("Training complete! Model and metadata saved successfully.")
    return metadata


if __name__ == "__main__":
    run_training_pipeline()
