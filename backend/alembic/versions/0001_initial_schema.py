"""Initial database schema for model_versions and scan_history.

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-11-11 02:25:00
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "model_versions",
        sa.Column("version", sa.String(length=64), nullable=False),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("dataset_name", sa.String(length=255), nullable=False),
        sa.Column("training_samples", sa.Integer(), nullable=False),
        sa.Column("test_samples", sa.Integer(), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=False),
        sa.Column("precision", sa.Float(), nullable=False),
        sa.Column("recall", sa.Float(), nullable=False),
        sa.Column("f1_score", sa.Float(), nullable=False),
        sa.Column("roc_auc", sa.Float(), nullable=False),
        sa.Column("metrics_json", sa.JSON(), nullable=False),
        sa.Column("feature_importance_json", sa.JSON(), nullable=False),
        sa.Column("trained_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("version"),
    )

    op.create_table(
        "scan_history",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("redacted_url", sa.String(length=2048), nullable=False),
        sa.Column("hostname", sa.String(length=255), nullable=False),
        sa.Column("prediction", sa.String(length=32), nullable=False),
        sa.Column("phishing_score", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(length=32), nullable=False),
        sa.Column("model_version", sa.String(length=64), nullable=False),
        sa.Column("extracted_features", sa.JSON(), nullable=False),
        sa.Column("risk_signals", sa.JSON(), nullable=False),
        sa.Column("scan_duration_ms", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_scan_history_created_at", "scan_history", ["created_at"], unique=False
    )
    op.create_index(
        "ix_scan_history_hostname", "scan_history", ["hostname"], unique=False
    )
    op.create_index(
        "ix_scan_history_prediction", "scan_history", ["prediction"], unique=False
    )
    op.create_index(
        "ix_scan_history_created_prediction",
        "scan_history",
        ["created_at", "prediction"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_scan_history_created_prediction", table_name="scan_history")
    op.drop_index("ix_scan_history_prediction", table_name="scan_history")
    op.drop_index("ix_scan_history_hostname", table_name="scan_history")
    op.drop_index("ix_scan_history_created_at", table_name="scan_history")
    op.drop_table("scan_history")
    op.drop_table("model_versions")
