"""Pydantic v2 request and response schemas for PhishGuard AI API endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils.url_sanitizer import validate_and_normalize_url


class ScanRequest(BaseModel):
    """Request payload for scanning a single URL."""

    url: str = Field(
        ...,
        min_length=4,
        max_length=2048,
        description="The full HTTP or HTTPS URL to analyze passively.",
        examples=["https://www.wikipedia.org/wiki/Machine_learning"],
    )

    @field_validator("url")
    @classmethod
    def validate_url_syntax(cls, value: str) -> str:
        return validate_and_normalize_url(value)


class RiskSignalSchema(BaseModel):
    """Human-understandable lexical risk or structural signal."""

    id: str
    title: str
    severity: Literal["high", "medium", "low", "info"]
    feature: str
    value: float | int
    description: str


class FeatureDetailSchema(BaseModel):
    """Detailed feature value with human-readable label and description."""

    name: str
    label: str
    category: str
    value: float | int
    description: str


class ScanResponse(BaseModel):
    """Response payload returned after scanning a URL or fetching scan details."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    submitted_url: str
    redacted_url: str
    hostname: str
    prediction: Literal["legitimate", "suspicious", "phishing"]
    phishing_score: float = Field(..., ge=0.0, le=1.0)
    risk_level: Literal["low", "medium", "high"]
    model_version: str
    model_name: str
    extracted_features: dict[str, float | int]
    feature_details: list[FeatureDetailSchema]
    risk_signals: list[RiskSignalSchema]
    scan_duration_ms: float
    created_at: datetime
    disclaimer: str


class HistoryItemSummarySchema(BaseModel):
    """Compact summary item for the paginated scan history list."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    redacted_url: str
    hostname: str
    prediction: Literal["legitimate", "suspicious", "phishing"]
    phishing_score: float
    risk_level: Literal["low", "medium", "high"]
    model_version: str
    scan_duration_ms: float
    created_at: datetime


class HistoryListResponse(BaseModel):
    """Paginated scan history response."""

    items: list[HistoryItemSummarySchema]
    total: int
    page: int
    page_size: int
    total_pages: int


class DeleteHistoryResponse(BaseModel):
    """Response returned when deleting one or all scan history records."""

    deleted_count: int
    message: str


class ClassificationDistributionItem(BaseModel):
    """Distribution count and percentage for a classification bucket."""

    classification: Literal["legitimate", "suspicious", "phishing"]
    label: str
    count: int
    percentage: float


class ScansOverTimeItem(BaseModel):
    """Daily aggregated scan counts."""

    date: str
    total: int
    phishing: int
    suspicious: int
    legitimate: int


class ModelEvaluationSummarySchema(BaseModel):
    """Compact model evaluation summary included in dashboard overview."""

    version: str
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    pr_auc: float
    trained_at: str


class AnalyticsOverviewResponse(BaseModel):
    """Real database telemetry and model evaluation summary for the Analytics Dashboard."""

    total_scans: int
    phishing_count: int
    legitimate_count: int
    suspicious_count: int
    phishing_percentage: float
    legitimate_percentage: float
    suspicious_percentage: float
    average_phishing_score: float
    average_scan_duration_ms: float
    classification_distribution: list[ClassificationDistributionItem]
    scans_over_time: list[ScansOverTimeItem]
    recent_scans: list[HistoryItemSummarySchema]
    model_summary: ModelEvaluationSummarySchema


class ConfusionMatrixSchema(BaseModel):
    tn: int
    fp: int
    fn: int
    tp: int
    false_positive_rate: float
    false_negative_rate: float


class EvaluationMetricsBlockSchema(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    pr_auc: float
    confusion_matrix: ConfusionMatrixSchema


class CandidateModelBenchmarkSchema(BaseModel):
    key: str
    name: str
    hyperparameters: dict[str, Any]
    validation_metrics: EvaluationMetricsBlockSchema
    test_metrics: EvaluationMetricsBlockSchema
    is_selected: bool


class FeatureImportanceItemSchema(BaseModel):
    feature: str
    label: str
    category: str
    importance: float
    description: str


class ModelInfoResponse(BaseModel):
    """Comprehensive model insights response from real versioned artifact metadata."""

    version: str
    selected_model_key: str
    selected_model_name: str
    hyperparameters: dict[str, Any]
    trained_at: str
    dataset: dict[str, Any]
    feature_count: int
    feature_names: list[str]
    decision_thresholds: dict[str, Any]
    validation_metrics: EvaluationMetricsBlockSchema
    test_metrics: EvaluationMetricsBlockSchema
    domain_grouped_test_metrics: dict[str, Any]
    candidate_models: list[CandidateModelBenchmarkSchema]
    feature_importances: list[FeatureImportanceItemSchema]


class HealthResponse(BaseModel):
    """System health check response."""

    status: str
    app_name: str
    app_version: str
    environment: str
    model_loaded: bool
    model_version: str
    database_connected: bool
