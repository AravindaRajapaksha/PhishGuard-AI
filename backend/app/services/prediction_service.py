"""Real-time URL prediction and explainability service."""

from __future__ import annotations

import time
from typing import Any
from urllib.parse import urlsplit

import numpy as np
import pandas as pd

from app.ml.model_loader import DEFAULT_MODEL_VERSION, ModelRegistry
from app.services.feature_extraction import (
    FEATURE_METADATA,
    FEATURE_NAMES,
    extract_url_features,
    generate_risk_signals,
)
from app.utils.url_sanitizer import redact_url_for_storage, validate_and_normalize_url

SAFETY_DISCLAIMER = (
    "Machine learning predictions are estimates and cannot guarantee that a URL is safe."
)


class PredictionService:
    """Service that validates URLs, extracts lexical features, and runs ML inference."""

    def __init__(self, model_version: str = DEFAULT_MODEL_VERSION) -> None:
        self.model_version = model_version

    def predict_url(self, raw_url: str) -> dict[str, Any]:
        """Validate a URL, extract its 24 lexical features, and generate a real ML prediction."""
        start_time = time.perf_counter()

        normalized_url = validate_and_normalize_url(raw_url)
        redacted_url = redact_url_for_storage(normalized_url)
        hostname = (urlsplit(normalized_url).hostname or "").lower().rstrip(".")

        features = extract_url_features(normalized_url)
        feature_df = pd.DataFrame([features], columns=FEATURE_NAMES)

        bundle = ModelRegistry.load(self.model_version)
        X_input: Any = feature_df
        if bundle.scaler is not None:
            X_input = bundle.scaler.transform(feature_df)

        proba = bundle.model.predict_proba(X_input)[0]
        phishing_score = round(float(np.clip(proba[1], 0.0, 1.0)), 4)

        thresholds = bundle.metadata.get(
            "decision_thresholds", {"low": 0.35, "high": 0.65}
        )
        low_thresh = float(thresholds.get("low", 0.35))
        high_thresh = float(thresholds.get("high", 0.65))

        if phishing_score >= high_thresh:
            prediction = "phishing"
            risk_level = "high"
        elif phishing_score >= low_thresh:
            prediction = "suspicious"
            risk_level = "medium"
        else:
            prediction = "legitimate"
            risk_level = "low"

        risk_signals = generate_risk_signals(normalized_url, features)

        # Enrich extracted features with metadata for UI presentation
        feature_details = [
            {
                "name": name,
                "label": FEATURE_METADATA[name]["label"],
                "category": FEATURE_METADATA[name]["category"],
                "value": features[name],
                "description": FEATURE_METADATA[name]["description"],
            }
            for name in FEATURE_NAMES
        ]

        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return {
            "submitted_url": redacted_url,
            "redacted_url": redacted_url,
            "hostname": hostname,
            "prediction": prediction,
            "phishing_score": phishing_score,
            "risk_level": risk_level,
            "model_version": bundle.version,
            "model_name": bundle.metadata.get("selected_model_name", "Classifier"),
            "extracted_features": features,
            "feature_details": feature_details,
            "risk_signals": risk_signals,
            "scan_duration_ms": duration_ms,
            "disclaimer": SAFETY_DISCLAIMER,
        }
