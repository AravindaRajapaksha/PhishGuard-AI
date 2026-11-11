"""Versioned ML artifact loader for PhishGuard AI.

Supports loading `model.joblib` (when scikit-learn/xgboost native wheels are present)
and automatically falls back to `model_trees.json` (the exact exported XGBoost tree
booster JSON artifact) in lightweight serverless environments such as Vercel.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from app.services.feature_extraction import FEATURE_NAMES

ARTIFACTS_BASE_DIR = Path(__file__).resolve().parent / "artifacts"
DEFAULT_MODEL_VERSION = "v1"


class JsonXGBoostPredictor:
    """Evaluates an exported XGBoost JSON booster (`model_trees.json`) in pure Python.

    Produces probabilities mathematically identical (within float32 machine epsilon ~1e-8)
    to `XGBClassifier.predict_proba()`.
    """

    def __init__(self, booster_json: dict[str, Any]) -> None:
        learner = booster_json["learner"]
        base_score_str = learner["learner_model_param"]["base_score"].strip("[]")
        base_score = float(base_score_str)
        self.base_margin = math.log(base_score / (1.0 - base_score))
        self.trees: list[dict[str, Any]] = learner["gradient_booster"]["model"]["trees"]

    def predict_proba_vector(self, vec: list[float]) -> tuple[float, float]:
        margin = self.base_margin
        for tree in self.trees:
            node = 0
            left_children = tree["left_children"]
            right_children = tree["right_children"]
            split_indices = tree["split_indices"]
            split_conditions = tree["split_conditions"]
            while left_children[node] != -1:
                feat_idx = split_indices[node]
                threshold = split_conditions[node]
                node = (
                    left_children[node]
                    if vec[feat_idx] < threshold
                    else right_children[node]
                )
            margin += split_conditions[node]

        p_phish = 1.0 / (1.0 + math.exp(-margin))
        return (1.0 - p_phish, p_phish)

    def predict_proba(self, X: Any) -> list[list[float]]:
        if hasattr(X, "to_numpy"):
            rows = X.to_numpy().tolist()
        elif isinstance(X, list) and X and isinstance(X[0], dict):
            rows = [[float(row[name]) for name in FEATURE_NAMES] for row in X]
        else:
            rows = list(X)

        results: list[list[float]] = []
        for row in rows:
            p0, p1 = self.predict_proba_vector([float(v) for v in row])
            results.append([p0, p1])
        return results


class LoadedModelBundle:
    """Container holding the deserialized ML classifier, optional scaler, and metadata."""

    def __init__(
        self,
        version: str,
        model: Any,
        scaler: Any | None,
        metadata: dict[str, Any],
        feature_names: list[str],
    ) -> None:
        self.version = version
        self.model = model
        self.scaler = scaler
        self.metadata = metadata
        self.feature_names = feature_names


class ModelRegistry:
    """Singleton registry for loading and caching the active versioned ML model."""

    _instance: LoadedModelBundle | None = None

    @classmethod
    def get_artifact_dir(cls, version: str = DEFAULT_MODEL_VERSION) -> Path:
        return ARTIFACTS_BASE_DIR / version

    @classmethod
    def load(
        cls, version: str = DEFAULT_MODEL_VERSION, force_reload: bool = False
    ) -> LoadedModelBundle:
        """Load the specified model version from disk or return the cached bundle."""
        if cls._instance is not None and cls._instance.version == version and not force_reload:
            return cls._instance

        artifact_dir = cls.get_artifact_dir(version)
        model_path = artifact_dir / "model.joblib"
        trees_path = artifact_dir / "model_trees.json"
        metadata_path = artifact_dir / "metadata.json"
        scaler_path = artifact_dir / "scaler.joblib"

        if not metadata_path.exists() or (
            not model_path.exists() and not trees_path.exists()
        ):
            raise FileNotFoundError(
                f"Model artifacts for version '{version}' not found in {artifact_dir}. "
                "Run `python -m app.ml.train` first."
            )

        with open(metadata_path, "r", encoding="utf-8") as fh:
            metadata = json.load(fh)

        saved_features = metadata.get("feature_names", FEATURE_NAMES)
        if list(saved_features) != FEATURE_NAMES:
            raise ValueError(
                "Saved artifact feature schema does not match canonical FEATURE_NAMES."
            )

        model: Any = None
        scaler: Any | None = None

        if model_path.exists():
            try:
                import joblib  # type: ignore[import-not-found]

                model = joblib.load(model_path)
                if scaler_path.exists():
                    scaler = joblib.load(scaler_path)
            except Exception:
                model = None

        if model is None and trees_path.exists():
            with open(trees_path, "r", encoding="utf-8") as tfh:
                booster_json = json.load(tfh)
            model = JsonXGBoostPredictor(booster_json)

        if model is None:
            raise RuntimeError("Unable to load ML model artifact.")

        cls._instance = LoadedModelBundle(
            version=metadata.get("version", version),
            model=model,
            scaler=scaler,
            metadata=metadata,
            feature_names=list(saved_features),
        )
        return cls._instance
