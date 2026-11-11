"""URL Scanning endpoint (`POST /api/v1/scan`)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import enforce_scan_rate_limit
from app.database.connection import get_db
from app.database.models import ScanHistory
from app.database.schemas import ScanRequest, ScanResponse
from app.services.prediction_service import PredictionService
from app.utils.url_sanitizer import URLValidationError

router = APIRouter(prefix="/api/v1/scan", tags=["URL Scanner"])


@router.post(
    "",
    response_model=ScanResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(enforce_scan_rate_limit)],
    summary="Passively analyze a URL using the trained ML classifier",
)
def scan_url(
    payload: ScanRequest,
    db: Session = Depends(get_db),
) -> ScanResponse:
    """Validate a submitted URL, extract 24 lexical features in memory, run ML inference,
    and persist the privacy-redacted scan record.
    """
    service = PredictionService(model_version=settings.MODEL_VERSION)
    try:
        result = service.predict_url(payload.url)
    except URLValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    record = ScanHistory(
        redacted_url=result["redacted_url"],
        hostname=result["hostname"],
        prediction=result["prediction"],
        phishing_score=result["phishing_score"],
        risk_level=result["risk_level"],
        model_version=result["model_version"],
        extracted_features=result["extracted_features"],
        risk_signals=result["risk_signals"],
        scan_duration_ms=result["scan_duration_ms"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return ScanResponse(
        id=record.id,
        submitted_url=record.redacted_url,
        redacted_url=record.redacted_url,
        hostname=record.hostname,
        prediction=record.prediction,  # type: ignore[arg-type]
        phishing_score=record.phishing_score,
        risk_level=record.risk_level,  # type: ignore[arg-type]
        model_version=record.model_version,
        model_name=result["model_name"],
        extracted_features=record.extracted_features,
        feature_details=result["feature_details"],
        risk_signals=record.risk_signals,
        scan_duration_ms=record.scan_duration_ms,
        created_at=record.created_at,
        disclaimer=result["disclaimer"],
    )
