"""Model Insights endpoint (`GET /api/v1/model/info`)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.database.schemas import ModelInfoResponse
from app.ml.model_loader import ModelRegistry

router = APIRouter(prefix="/api/v1/model", tags=["Model Insights"])


@router.get(
    "/info",
    response_model=ModelInfoResponse,
    summary="Retrieve active ML model metadata, evaluation metrics, and feature importances",
)
def get_model_info() -> ModelInfoResponse:
    """Return complete model evaluation metrics, confusion matrix, candidate model benchmarks,
    and global feature importances from the active serialized artifact.
    """
    try:
        bundle = ModelRegistry.load(settings.MODEL_VERSION)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trained model artifact is not currently available.",
        ) from exc

    meta = bundle.metadata
    return ModelInfoResponse(
        version=meta["version"],
        selected_model_key=meta["selected_model_key"],
        selected_model_name=meta["selected_model_name"],
        hyperparameters=meta["hyperparameters"],
        trained_at=meta["trained_at"],
        dataset=meta["dataset"],
        feature_count=meta["feature_count"],
        feature_names=meta["feature_names"],
        decision_thresholds=meta["decision_thresholds"],
        validation_metrics=meta["validation_metrics"],
        test_metrics=meta["test_metrics"],
        domain_grouped_test_metrics=meta["domain_grouped_test_metrics"],
        candidate_models=meta["candidate_models"],
        feature_importances=meta["feature_importances"],
    )
