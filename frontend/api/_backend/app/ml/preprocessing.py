"""Data cleaning, anti-leakage deduplication, splitting, and feature preparation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Iterable
from urllib.parse import urlsplit

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit, train_test_split

from app.services.feature_extraction import FEATURE_NAMES, extract_url_features
from app.utils.url_sanitizer import extract_registrable_domain


@dataclass
class DatasetAuditStats:
    """Exact audit statistics computed during dataset cleaning and deduplication."""

    raw_records_downloaded: int
    missing_or_invalid_removed: int
    duplicate_records_removed: int
    conflicting_label_records_removed: int
    final_cleaned_records: int
    legitimate_count: int
    phishing_count: int
    unique_registrable_domains: int
    train_records: int = 0
    validation_records: int = 0
    test_records: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def normalize_url_for_dedup(raw_url: str) -> str | None:
    """Normalize a raw dataset URL for canonical deduplication and verify parseability."""
    if not isinstance(raw_url, str):
        return None
    cleaned = raw_url.strip()
    if not cleaned or len(cleaned) > 2048:
        return None
    if any(ord(c) <= 0x20 or ord(c) == 0x7F for c in cleaned):
        return None

    if not cleaned.lower().startswith(("http://", "https://")):
        cleaned = f"http://{cleaned}"

    try:
        parsed = urlsplit(cleaned)
    except ValueError:
        return None

    scheme = (parsed.scheme or "").lower()
    if scheme not in {"http", "https"}:
        return None

    hostname = (parsed.hostname or "").lower().rstrip(".")
    if not hostname or ("." not in hostname and hostname != "localhost"):
        return None

    return cleaned


def clean_and_deduplicate_dataset(
    df: pd.DataFrame, url_col: str = "url", label_col: str = "label"
) -> tuple[pd.DataFrame, DatasetAuditStats]:
    """Clean raw URL dataframe, validate labels, remove duplicates and conflicting labels."""
    raw_total = len(df)
    if url_col not in df.columns or label_col not in df.columns:
        raise ValueError(
            f"Dataset must contain '{url_col}' and '{label_col}' columns. Found: {list(df.columns)}"
        )

    work = df[[url_col, label_col]].copy()
    work.columns = ["raw_url", "raw_label"]

    # Drop nulls
    work = work.dropna(subset=["raw_url", "raw_label"])

    # Standardize labels to 0 (legitimate) and 1 (phishing)
    def _parse_label(val: Any) -> int | None:
        if isinstance(val, (int, np.integer)):
            if int(val) in (0, 1):
                return int(val)
        s = str(val).strip().lower()
        if s in {"1", "phishing", "bad", "malicious", "phish", "true"}:
            return 1
        if s in {"0", "legitimate", "good", "benign", "legit", "safe", "false"}:
            return 0
        return None

    work["label"] = work["raw_label"].map(_parse_label)
    work["url"] = work["raw_url"].map(normalize_url_for_dedup)

    valid_mask = work["label"].notna() & work["url"].notna()
    after_valid = work.loc[valid_mask, ["url", "label"]].copy()
    after_valid["label"] = after_valid["label"].astype(int)
    missing_or_invalid_removed = raw_total - len(after_valid)

    # Canonical deduplication key (lowercase scheme+host, stripped trailing slash on root)
    def _canonical_key(u: str) -> str:
        p = urlsplit(u)
        host = (p.hostname or "").lower().rstrip(".")
        path = p.path if p.path != "/" else ""
        return f"{p.scheme.lower()}://{host}{path}?{p.query}"

    after_valid["canonical_key"] = after_valid["url"].map(_canonical_key)

    # Identify URLs that appear with both label 0 and label 1 (conflicting ground truth)
    label_nunique = after_valid.groupby("canonical_key")["label"].nunique()
    conflicting_keys = set(label_nunique[label_nunique > 1].index)
    conflicting_mask = after_valid["canonical_key"].isin(conflicting_keys)
    conflicting_removed = int(conflicting_mask.sum())
    after_conflict = after_valid.loc[~conflicting_mask].copy()

    # Drop exact canonical duplicates
    before_dedup_len = len(after_conflict)
    cleaned = after_conflict.drop_duplicates(subset=["canonical_key"], keep="first").copy()
    duplicate_removed = before_dedup_len - len(cleaned)

    # Extract hostname and registrable domain for domain-aware splitting
    cleaned["hostname"] = cleaned["url"].map(
        lambda u: (urlsplit(u).hostname or "").lower().rstrip(".")
    )
    cleaned["registrable_domain"] = cleaned["hostname"].map(extract_registrable_domain)
    cleaned = cleaned.reset_index(drop=True)

    legit_count = int((cleaned["label"] == 0).sum())
    phish_count = int((cleaned["label"] == 1).sum())
    unique_domains = int(cleaned["registrable_domain"].nunique())

    stats = DatasetAuditStats(
        raw_records_downloaded=raw_total,
        missing_or_invalid_removed=missing_or_invalid_removed,
        duplicate_records_removed=duplicate_removed,
        conflicting_label_records_removed=conflicting_removed,
        final_cleaned_records=len(cleaned),
        legitimate_count=legit_count,
        phishing_count=phish_count,
        unique_registrable_domains=unique_domains,
    )
    return cleaned, stats


def split_dataset_stratified(
    cleaned_df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_state: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Perform a reproducible 70/15/15 stratified train/validation/test split."""
    if not np.isclose(train_ratio + val_ratio + test_ratio, 1.0):
        raise ValueError("Split ratios must sum to 1.0")

    train_df, temp_df = train_test_split(
        cleaned_df,
        test_size=(1.0 - train_ratio),
        stratify=cleaned_df["label"],
        random_state=random_state,
    )
    relative_test_ratio = test_ratio / (val_ratio + test_ratio)
    val_df, test_df = train_test_split(
        temp_df,
        test_size=relative_test_ratio,
        stratify=temp_df["label"],
        random_state=random_state,
    )
    return (
        train_df.reset_index(drop=True),
        val_df.reset_index(drop=True),
        test_df.reset_index(drop=True),
    )


def split_dataset_domain_grouped(
    cleaned_df: pd.DataFrame,
    test_size: float = 0.20,
    random_state: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Perform a domain-grouped train/test split where no registrable domain spans both splits."""
    gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_idx, test_idx = next(
        gss.split(cleaned_df, cleaned_df["label"], groups=cleaned_df["registrable_domain"])
    )
    return (
        cleaned_df.iloc[train_idx].reset_index(drop=True),
        cleaned_df.iloc[test_idx].reset_index(drop=True),
    )


def build_feature_matrix(urls: Iterable[str]) -> pd.DataFrame:
    """Extract the 24-feature matrix using the shared feature_extraction module."""
    rows = [extract_url_features(u) for u in urls]
    return pd.DataFrame(rows, columns=FEATURE_NAMES)
