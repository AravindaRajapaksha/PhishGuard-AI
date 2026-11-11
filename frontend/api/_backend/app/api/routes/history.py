"""Scan History CRUD endpoints (`/api/v1/history`)."""

from __future__ import annotations

import math
from datetime import datetime, time, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.connection import get_db
from app.database.models import ScanHistory
from app.database.schemas import (
    DeleteHistoryResponse,
    HistoryItemSummarySchema,
    HistoryListResponse,
    ScanResponse,
)
from app.ml.model_loader import ModelRegistry
from app.services.feature_extraction import FEATURE_METADATA, FEATURE_NAMES
from app.services.prediction_service import SAFETY_DISCLAIMER

router = APIRouter(prefix="/api/v1/history", tags=["Scan History"])


@router.get(
    "",
    response_model=HistoryListResponse,
    summary="List paginated scan history with search, prediction, and date filters",
)
def list_scan_history(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(15, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Substring search on URL or hostname"),
    prediction: Literal["legitimate", "suspicious", "phishing"] | None = Query(
        None, description="Filter by prediction classification"
    ),
    start_date: str | None = Query(
        None, description="ISO date (YYYY-MM-DD) lower bound"
    ),
    end_date: str | None = Query(
        None, description="ISO date (YYYY-MM-DD) upper bound"
    ),
    db: Session = Depends(get_db),
) -> HistoryListResponse:
    """Retrieve paginated, privacy-redacted scan history records."""
    stmt = select(ScanHistory)
    count_stmt = select(func.count()).select_from(ScanHistory)

    filters = []
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                ScanHistory.redacted_url.ilike(pattern),
                ScanHistory.hostname.ilike(pattern),
            )
        )

    if prediction:
        filters.append(ScanHistory.prediction == prediction)

    if start_date:
        try:
            dt_start = datetime.combine(
                datetime.fromisoformat(start_date[:10]).date(),
                time.min,
                tzinfo=timezone.utc,
            )
            filters.append(ScanHistory.created_at >= dt_start)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid start_date format; expected YYYY-MM-DD.",
            ) from exc

    if end_date:
        try:
            dt_end = datetime.combine(
                datetime.fromisoformat(end_date[:10]).date(),
                time.max,
                tzinfo=timezone.utc,
            )
            filters.append(ScanHistory.created_at <= dt_end)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid end_date format; expected YYYY-MM-DD.",
            ) from exc

    for condition in filters:
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    total = int(db.execute(count_stmt).scalar_one() or 0)
    total_pages = max(1, math.ceil(total / page_size)) if total > 0 else 1
    offset = (page - 1) * page_size

    rows = (
        db.execute(
            stmt.order_by(ScanHistory.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        .scalars()
        .all()
    )

    items = [HistoryItemSummarySchema.model_validate(row) for row in rows]
    return HistoryListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{scan_id}",
    response_model=ScanResponse,
    summary="Retrieve full details and extracted features for a specific historical scan",
)
def get_scan_detail(
    scan_id: str,
    db: Session = Depends(get_db),
) -> ScanResponse:
    """Return full scan details, risk signals, and 24 extracted features by scan ID."""
    record = db.get(ScanHistory, scan_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan record '{scan_id}' not found.",
        )

    try:
        bundle = ModelRegistry.load(settings.MODEL_VERSION)
        model_name = bundle.metadata.get("selected_model_name", "XGBoost")
    except FileNotFoundError:
        model_name = "XGBoost"

    features = record.extracted_features or {}
    feature_details = [
        {
            "name": name,
            "label": FEATURE_METADATA[name]["label"],
            "category": FEATURE_METADATA[name]["category"],
            "value": features.get(name, 0),
            "description": FEATURE_METADATA[name]["description"],
        }
        for name in FEATURE_NAMES
    ]

    return ScanResponse(
        id=record.id,
        submitted_url=record.redacted_url,
        redacted_url=record.redacted_url,
        hostname=record.hostname,
        prediction=record.prediction,  # type: ignore[arg-type]
        phishing_score=record.phishing_score,
        risk_level=record.risk_level,  # type: ignore[arg-type]
        model_version=record.model_version,
        model_name=model_name,
        extracted_features=features,
        feature_details=feature_details,
        risk_signals=record.risk_signals or [],
        scan_duration_ms=record.scan_duration_ms,
        created_at=record.created_at,
        disclaimer=SAFETY_DISCLAIMER,
    )


@router.delete(
    "/{scan_id}",
    response_model=DeleteHistoryResponse,
    summary="Delete a single scan record from history",
)
def delete_scan_record(
    scan_id: str,
    db: Session = Depends(get_db),
) -> DeleteHistoryResponse:
    """Delete an individual scan history record by ID."""
    record = db.get(ScanHistory, scan_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan record '{scan_id}' not found.",
        )
    db.delete(record)
    db.commit()
    return DeleteHistoryResponse(
        deleted_count=1,
        message=f"Scan record '{scan_id}' deleted.",
    )


@router.delete(
    "",
    response_model=DeleteHistoryResponse,
    summary="Clear all scan history records",
)
def clear_all_scan_history(
    db: Session = Depends(get_db),
) -> DeleteHistoryResponse:
    """Delete all scan records from the database."""
    rows = db.execute(select(ScanHistory)).scalars().all()
    count = len(rows)
    for row in rows:
        db.delete(row)
    db.commit()
    return DeleteHistoryResponse(
        deleted_count=count,
        message=f"Cleared {count} scan history record(s).",
    )
