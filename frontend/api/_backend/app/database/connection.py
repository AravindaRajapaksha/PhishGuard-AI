"""Database engine, session factory, and startup initialization."""

from __future__ import annotations

from collections.abc import Generator
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.database.models import Base, ModelVersion
from app.ml.model_loader import ModelRegistry

connect_args = (
    {"check_same_thread": False}
    if settings.DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_db_initialized: bool = False


def get_db() -> Generator[Session, None, None]:
    """Yield a SQLAlchemy database session per request."""
    global _db_initialized
    if not _db_initialized:
        init_db_and_sync_model_version()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db_and_sync_model_version() -> None:
    """Create tables if they do not exist and register the active ML model version."""
    global _db_initialized
    Base.metadata.create_all(bind=engine)
    _db_initialized = True

    try:
        bundle = ModelRegistry.load(settings.MODEL_VERSION)
    except FileNotFoundError:
        return

    meta = bundle.metadata
    version_str = meta.get("version", bundle.version)
    test_metrics = meta.get("test_metrics", {})
    audit = meta.get("dataset", {}).get("audit", {})

    trained_at_raw = meta.get("trained_at")
    if isinstance(trained_at_raw, str):
        try:
            trained_at = datetime.fromisoformat(trained_at_raw)
        except ValueError:
            trained_at = datetime.now(timezone.utc)
    else:
        trained_at = datetime.now(timezone.utc)

    with SessionLocal() as db:
        existing = db.get(ModelVersion, version_str)
        if existing is None:
            record = ModelVersion(
                version=version_str,
                model_name=meta.get("selected_model_name", "XGBoost"),
                dataset_name=meta.get("dataset", {}).get("name", "Verified URL Corpus"),
                training_samples=int(audit.get("train_records", 0)),
                test_samples=int(audit.get("test_records", 0)),
                accuracy=float(test_metrics.get("accuracy", 0.0)),
                precision=float(test_metrics.get("precision", 0.0)),
                recall=float(test_metrics.get("recall", 0.0)),
                f1_score=float(test_metrics.get("f1_score", 0.0)),
                roc_auc=float(test_metrics.get("roc_auc", 0.0)),
                metrics_json={
                    "validation_metrics": meta.get("validation_metrics", {}),
                    "test_metrics": test_metrics,
                    "domain_grouped_test_metrics": meta.get(
                        "domain_grouped_test_metrics", {}
                    ),
                    "candidate_models": meta.get("candidate_models", []),
                    "decision_thresholds": meta.get("decision_thresholds", {}),
                    "dataset": meta.get("dataset", {}),
                    "hyperparameters": meta.get("hyperparameters", {}),
                },
                feature_importance_json=meta.get("feature_importances", []),
                trained_at=trained_at,
                is_active=True,
            )
            db.add(record)
        else:
            existing.model_name = meta.get("selected_model_name", existing.model_name)
            existing.accuracy = float(test_metrics.get("accuracy", existing.accuracy))
            existing.precision = float(test_metrics.get("precision", existing.precision))
            existing.recall = float(test_metrics.get("recall", existing.recall))
            existing.f1_score = float(test_metrics.get("f1_score", existing.f1_score))
            existing.roc_auc = float(test_metrics.get("roc_auc", existing.roc_auc))
            existing.metrics_json = {
                "validation_metrics": meta.get("validation_metrics", {}),
                "test_metrics": test_metrics,
                "domain_grouped_test_metrics": meta.get(
                    "domain_grouped_test_metrics", {}
                ),
                "candidate_models": meta.get("candidate_models", []),
                "decision_thresholds": meta.get("decision_thresholds", {}),
                "dataset": meta.get("dataset", {}),
                "hyperparameters": meta.get("hyperparameters", {}),
            }
            existing.feature_importance_json = meta.get("feature_importances", [])
            existing.is_active = True

        db.commit()
