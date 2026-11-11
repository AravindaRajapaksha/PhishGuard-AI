"""Tests for dataset cleaning, anti-leakage splits, model loading, and train/inference parity."""

from __future__ import annotations

import pandas as pd

from app.ml.model_loader import ModelRegistry
from app.ml.preprocessing import (
    build_feature_matrix,
    clean_and_deduplicate_dataset,
    split_dataset_domain_grouped,
    split_dataset_stratified,
)
from app.services.feature_extraction import FEATURE_NAMES, extract_url_features
from app.services.prediction_service import SAFETY_DISCLAIMER, PredictionService


def test_clean_and_deduplicate_removes_duplicates_and_conflicts() -> None:
    sample_df = pd.DataFrame(
        {
            "url": [
                "https://www.wikipedia.org/wiki/Security",
                "https://www.wikipedia.org/wiki/Security",  # Exact duplicate
                "http://conflicting.example.com/login",  # Conflict label 0
                "http://conflicting.example.com/login",  # Conflict label 1
                "http://paypal-verify.account-update.xyz/login",
                "",  # Invalid empty
            ],
            "label": [0, 0, 0, 1, 1, 0],
        }
    )
    cleaned, stats = clean_and_deduplicate_dataset(sample_df)
    assert stats.raw_records_downloaded == 6
    assert stats.missing_or_invalid_removed == 1
    assert stats.conflicting_label_records_removed == 2
    assert stats.duplicate_records_removed == 1
    assert stats.final_cleaned_records == 2
    assert len(cleaned) == 2


def test_domain_grouped_split_has_zero_domain_leakage() -> None:
    rows = []
    for i in range(30):
        rows.append({"url": f"https://site-{i}.org/page1", "label": 0})
        rows.append({"url": f"https://site-{i}.org/page2", "label": 0})
        rows.append({"url": f"http://phish-{i}.xyz/login", "label": 1})
    df, _ = clean_and_deduplicate_dataset(pd.DataFrame(rows))
    train_df, val_df, test_df = split_dataset_stratified(df)
    assert len(train_df) + len(val_df) + len(test_df) == len(df)

    dom_train, dom_test = split_dataset_domain_grouped(df, test_size=0.25)
    overlap = set(dom_train["registrable_domain"]).intersection(
        set(dom_test["registrable_domain"])
    )
    assert len(overlap) == 0


def test_model_registry_loads_trained_v1_artifact() -> None:
    bundle = ModelRegistry.load()
    assert bundle.version == "v1.0.0"
    assert bundle.feature_names == FEATURE_NAMES
    assert "test_metrics" in bundle.metadata
    assert "candidate_models" in bundle.metadata
    assert len(bundle.metadata["candidate_models"]) == 4
    assert bundle.metadata["test_metrics"]["accuracy"] > 0.75
    assert bundle.metadata["test_metrics"]["roc_auc"] > 0.80


def test_train_inference_feature_parity_and_prediction_service() -> None:
    service = PredictionService()
    phish_url = "http://secure-login.paypal.com.account-verify.xyz/signin?session=secret123"
    legit_url = "https://www.wikipedia.org/wiki/Computer_security"

    # Check offline feature matrix matches online feature dict identically
    offline_row = build_feature_matrix([phish_url]).iloc[0].to_dict()
    online_dict = extract_url_features(phish_url)
    assert offline_row == online_dict

    phish_result = service.predict_url(phish_url)
    assert phish_result["prediction"] in {"phishing", "suspicious"}
    assert phish_result["phishing_score"] >= 0.50
    assert "secret123" not in phish_result["redacted_url"]
    assert "session=[REDACTED]" in phish_result["redacted_url"]
    assert phish_result["disclaimer"] == SAFETY_DISCLAIMER
    assert len(phish_result["feature_details"]) == 24

    legit_result = service.predict_url(legit_url)
    assert legit_result["prediction"] == "legitimate"
    assert legit_result["phishing_score"] < 0.35
