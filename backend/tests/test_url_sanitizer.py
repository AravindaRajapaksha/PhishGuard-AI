"""Unit tests for URL validation, domain extraction, and privacy-preserving query redaction."""

from __future__ import annotations

import pytest

from app.utils.url_sanitizer import (
    MAX_URL_LENGTH,
    URLValidationError,
    extract_registrable_domain,
    extract_subdomain_count,
    is_ip_literal,
    redact_url_for_storage,
    validate_and_normalize_url,
)


def test_validate_and_normalize_valid_urls() -> None:
    assert (
        validate_and_normalize_url("HTTPS://example.com/login?user=1")
        == "https://example.com/login?user=1"
    )
    assert (
        validate_and_normalize_url("  http://sub.domain.co.uk/path/to/page  ")
        == "http://sub.domain.co.uk/path/to/page"
    )
    assert (
        validate_and_normalize_url("http://192.168.1.1:8080/admin")
        == "http://192.168.1.1:8080/admin"
    )


def test_validate_rejects_empty_or_non_string() -> None:
    with pytest.raises(URLValidationError):
        validate_and_normalize_url("")
    with pytest.raises(URLValidationError):
        validate_and_normalize_url("   ")


def test_validate_rejects_disallowed_schemes() -> None:
    for bad in [
        "ftp://files.example.com/archive.zip",
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "file:///etc/passwd",
        "example.com/login",
    ]:
        with pytest.raises(URLValidationError):
            validate_and_normalize_url(bad)


def test_validate_rejects_excessive_length_and_whitespace() -> None:
    long_url = "https://example.com/" + ("a" * MAX_URL_LENGTH)
    with pytest.raises(URLValidationError):
        validate_and_normalize_url(long_url)

    with pytest.raises(URLValidationError):
        validate_and_normalize_url("https://example.com/path with spaces/login")


def test_extract_registrable_domain_and_subdomains() -> None:
    assert extract_registrable_domain("www.google.com") == "google.com"
    assert extract_subdomain_count("www.google.com") == 0
    assert extract_subdomain_count("mail.google.com") == 1

    assert (
        extract_registrable_domain("a.b.portal.university.ac.uk")
        == "university.ac.uk"
    )
    assert extract_subdomain_count("a.b.portal.university.ac.uk") == 3

    assert extract_registrable_domain("10.0.0.1") == "10.0.0.1"
    assert extract_subdomain_count("10.0.0.1") == 0
    assert is_ip_literal("10.0.0.1") is True


def test_redact_url_for_storage_masks_sensitive_query_and_credentials() -> None:
    raw = "https://admin:supersecret@secure.example.com/reset?token=xyz987&email=alice@company.com#section2"
    redacted = redact_url_for_storage(raw)
    assert "supersecret" not in redacted
    assert "xyz987" not in redacted
    assert "alice@company.com" not in redacted
    assert "section2" not in redacted
    assert (
        redacted
        == "https://[REDACTED]@secure.example.com/reset?token=[REDACTED]&email=[REDACTED]#[REDACTED]"
    )
