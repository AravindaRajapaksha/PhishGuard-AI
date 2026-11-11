"""Analytics Dashboard endpoint (`GET /api/v1/analytics/overview`)."""

from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.connection import get_db
from app.database.models import ScanHistory
from app.database.schemas import (
    AnalyticsOverviewResponse,
    ClassificationDistributionItem,
    HistoryItemSummarySchema,
    ModelEvaluationSummarySchema,
    ScansOverTimeItem,
)
from app.ml.model_loader import ModelRegistry

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
    summary="Retrieve real-time scan telemetry and model evaluation summary",
)
def get_analytics_overview(
    db: Session = Depends(get_db),
) -> AnalyticsOverviewResponse:
    """Compute dashboard statistics from live database records and model evaluation metadata."""
    rows = (
        db.execute(select(ScanHistory).order_by(ScanHistory.created_at.desc()))
        .scalars()
        .all()
    )

    total_scans = len(rows)
    phishing_count = sum(1 for r in rows if r.prediction == "phishing")
    suspicious_count = sum(1 for r in rows if r.prediction == "suspicious")
    legitimate_count = sum(1 for r in rows if r.prediction == "legitimate")

    if total_scans > 0:
        phish_pct = round((phishing_count / total_scans) * 100.0, 1)
        susp_pct = round((suspicious_count / total_scans) * 100.0, 1)
        legit_pct = round((legitimate_count / total_scans) * 100.0, 1)
        avg_score = round(sum(r.phishing_score for r in rows) / total_scans, 4)
        avg_duration = round(sum(r.scan_duration_ms for r in rows) / total_scans, 2)
    else:
        phish_pct = 0.0
        susp_pct = 0.0
        legit_pct = 0.0
        avg_score = 0.0
        avg_duration = 0.0

    classification_distribution = [
        ClassificationDistributionItem(
            classification="legitimate",
            label="Legitimate",
            count=legitimate_count,
            percentage=legit_pct,
        ),
        ClassificationDistributionItem(
            classification="suspicious",
            label="Suspicious / Uncertain",
            count=suspicious_count,
            percentage=susp_pct,
        ),
        ClassificationDistributionItem(
            classification="phishing",
            label="Phishing",
            count=phishing_count,
            percentage=phish_pct,
        ),
    ]

    # Group scans by UTC date string (YYYY-MM-DD)
    daily_buckets: dict[str, dict[str, int]] = defaultdict(
        lambda: {"total": 0, "phishing": 0, "suspicious": 0, "legitimate": 0}
    )
    for row in rows:
        day_key = row.created_at.strftime("%Y-%m-%d")
        daily_buckets[day_key]["total"] += 1
        if row.prediction in {"phishing", "suspicious", "legitimate"}:
            daily_buckets[day_key][row.prediction] += 1

    scans_over_time = [
        ScansOverTimeItem(
            date=day,
            total=counts["total"],
            phishing=counts["phishing"],
            suspicious=counts["suspicious"],
            legitimate=counts["legitimate"],
        )
        for day, counts in sorted(daily_buckets.items())
    ]

    recent_scans = [
        HistoryItemSummarySchema.model_validate(r) for r in rows[:10]
    ]

    bundle = ModelRegistry.load(settings.MODEL_VERSION)
    meta = bundle.metadata
    test_metrics = meta.get("test_metrics", {})

    model_summary = ModelEvaluationSummarySchema(
        version=meta.get("version", bundle.version),
        model_name=meta.get("selected_model_name", "XGBoost"),
        accuracy=float(test_metrics.get("accuracy", 0.0)),
        precision=float(test_metrics.get("precision", 0.0)),
        recall=float(test_metrics.get("recall", 0.0)),
        f1_score=float(test_metrics.get("f1_score", 0.0)),
        roc_auc=float(test_metrics.get("roc_auc", 0.0)),
        pr_auc=float(test_metrics.get("pr_auc", 0.0)),
        trained_at=str(meta.get("trained_at", "")),
    )

    return AnalyticsOverviewResponse(
        total_scans=total_scans,
        phishing_count=phishing_count,
        legitimate_count=legitimate_count,
        suspicious_count=suspicious_count,
        phishing_percentage=phish_pct,
        legitimate_percentage=legit_pct,
        suspicious_percentage=susp_pct,
        average_phishing_score=avg_score,
        average_scan_duration_ms=avg_duration,
        classification_distribution=classification_distribution,
        scans_over_time=scans_over_time,
        recent_scans=recent_scans,
        model_summary=model_summary,
    )
