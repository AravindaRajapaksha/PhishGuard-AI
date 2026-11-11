"""Versioned ML artifact loader for PhishGuard AI."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib

from app.services.feature_extraction import FEATURE_NAMES

ARTIFACTS_BASE_DIR = Path(__file__).resolve().parent / "artifacts"
DEFAULT_MODEL_VERSION = "v1"


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
        metadata_path = artifact_dir / "metadata.json"
        scaler_path = artifact_dir / "scaler.joblib"

        if not model_path.exists() or not metadata_path.exists():
            raise FileNotFoundError(
                f"Model artifacts for version '{version}' not found in {artifact_dir}. "
                "Run `python -m app.ml.train` first."
            )

        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path) if scaler_path.exists() else None
        with open(metadata_path, "r", encoding="utf-8") as fh:
            metadata = json.load(fh)

        saved_features = metadata.get("feature_names", FEATURE_NAMES)
        if list(saved_features) != FEATURE_NAMES:
            raise ValueError(
                "Saved artifact feature schema does not match canonical FEATURE_NAMES."
            )

        cls._instance = LoadedModelBundle(
            version=metadata.get("version", version),
            model=model,
            scaler=scaler,
            metadata=metadata,
            feature_names=list(saved_features),
        )
        return cls._instance
