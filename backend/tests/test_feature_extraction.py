"""Unit tests for the shared lexical and structural URL feature extraction module."""

from __future__ import annotations

from app.services.feature_extraction import (
    FEATURE_METADATA,
    FEATURE_NAMES,
    calculate_shannon_entropy,
    extract_feature_vector,
    extract_url_features,
    generate_risk_signals,
)


def test_feature_schema_completeness() -> None:
    assert len(FEATURE_NAMES) == 24
    for name in FEATURE_NAMES:
        assert name in FEATURE_METADATA
        assert "label" in FEATURE_METADATA[name]
        assert "category" in FEATURE_METADATA[name]
        assert "description" in FEATURE_METADATA[name]


def test_extract_url_features_clean_legitimate_url() -> None:
    url = "https://www.wikipedia.org/wiki/Machine_learning"
    features = extract_url_features(url)
    assert list(features.keys()) == FEATURE_NAMES
    assert features["url_length"] == len(url)
    assert features["hostname_length"] == len("wikipedia.org")
    assert features["domain_length"] == len("wikipedia.org")
    assert features["subdomain_count"] == 0
    assert features["is_https"] == 1
    assert features["is_ip_address"] == 0
    assert features["has_punycode"] == 0
    assert features["at_symbol_present"] == 0
    assert features["suspicious_keyword_count"] == 0


def test_extract_url_features_suspicious_phishing_patterns() -> None:
    url = "http://paypal.com@192.168.10.25/secure-login/verify/account?session=9981&user=test"
    features = extract_url_features(url)
    assert features["is_https"] == 0
    assert features["is_ip_address"] == 1
    assert features["at_symbol_present"] == 1
    assert features["suspicious_keyword_count"] >= 4
    assert features["query_param_count"] == 2

    signals = generate_risk_signals(url, features)
    signal_ids = {s["id"] for s in signals}
    assert "ip_hostname" in signal_ids
    assert "at_symbol_deception" in signal_ids
    assert "suspicious_keywords" in signal_ids


def test_feature_vector_order_parity() -> None:
    url = "https://xn--pple-43d.com/login-verify?id=42"
    feat_dict = extract_url_features(url)
    feat_vec = extract_feature_vector(url)
    assert len(feat_vec) == len(FEATURE_NAMES)
    for idx, name in enumerate(FEATURE_NAMES):
        assert feat_vec[idx] == float(feat_dict[name])
    assert feat_dict["has_punycode"] == 1


def test_shannon_entropy_calculation() -> None:
    assert calculate_shannon_entropy("") == 0.0
    assert calculate_shannon_entropy("aaaa") == 0.0
    assert abs(calculate_shannon_entropy("ab") - 1.0) < 1e-4
