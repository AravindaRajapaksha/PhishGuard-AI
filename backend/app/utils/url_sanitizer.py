"""Passive URL validation, domain extraction, and privacy-preserving query redaction.

Security Guarantee:
This module operates strictly on in-memory strings using Python's standard library.
It never issues DNS, HTTP, HTTPS, or socket requests to submitted URLs.
"""

from __future__ import annotations

import ipaddress
import re
from urllib.parse import parse_qsl, urlsplit, urlunsplit

MAX_URL_LENGTH = 2048
ALLOWED_SCHEMES = {"http", "https"}

# Control characters and whitespace forbidden inside a valid URL
_CONTROL_OR_WHITESPACE_RE = re.compile(r"[\x00-\x20\x7f]")

# Valid hostname label pattern (RFC 1123 / IDN punycode compatible)
_HOSTNAME_LABEL_RE = re.compile(r"^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$", re.IGNORECASE)

# Common two-level public suffixes for offline registrable domain extraction
_MULTI_PART_TLDS = {
    "co.uk",
    "org.uk",
    "ac.uk",
    "gov.uk",
    "com.au",
    "net.au",
    "org.au",
    "edu.au",
    "co.jp",
    "ne.jp",
    "or.jp",
    "co.in",
    "net.in",
    "org.in",
    "ac.in",
    "gov.in",
    "com.br",
    "net.br",
    "org.br",
    "com.sg",
    "edu.sg",
    "gov.sg",
    "co.za",
    "org.za",
    "co.nz",
    "org.nz",
    "com.mx",
    "com.tr",
    "com.cn",
    "org.cn",
    "com.hk",
    "com.tw",
    "co.kr",
    "ac.lk",
    "gov.lk",
    "com.lk",
    "org.lk",
    "com.my",
    "co.id",
    "com.ph",
    "com.vn",
    "com.pk",
    "com.ng",
    "co.ke",
    "com.ar",
    "com.co",
    "com.pe",
    "co.il",
}


class URLValidationError(ValueError):
    """Raised when a submitted URL fails structural or security validation."""


def is_ip_literal(hostname: str) -> bool:
    """Return True if the hostname is a valid IPv4 or IPv6 literal address."""
    if not hostname:
        return False
    cleaned = hostname.strip("[]")
    try:
        ipaddress.ip_address(cleaned)
        return True
    except ValueError:
        return False


def validate_and_normalize_url(raw_url: str) -> str:
    """Validate a user-submitted URL string and return a normalized representation.

    Validation rules:
    1. Non-empty string up to 2048 characters.
    2. No internal whitespace or ASCII control characters.
    3. Explicit `http` or `https` scheme.
    4. Non-empty, structurally valid hostname (valid domain with TLD or IP literal).
    5. Valid port number if specified.

    Raises:
        URLValidationError: If any validation check fails.
    """
    if not isinstance(raw_url, str):
        raise URLValidationError("URL must be a string.")

    trimmed = raw_url.strip()
    if not trimmed:
        raise URLValidationError("URL cannot be empty.")

    if len(trimmed) > MAX_URL_LENGTH:
        raise URLValidationError(
            f"URL exceeds maximum allowed length of {MAX_URL_LENGTH} characters."
        )

    if _CONTROL_OR_WHITESPACE_RE.search(trimmed):
        raise URLValidationError(
            "URL contains invalid whitespace or control characters."
        )

    try:
        parsed = urlsplit(trimmed)
    except ValueError as exc:
        raise URLValidationError(f"Malformed URL syntax: {exc}") from exc

    scheme = (parsed.scheme or "").lower()
    if scheme not in ALLOWED_SCHEMES:
        raise URLValidationError(
            "URL must start with a valid 'http://' or 'https://' scheme."
        )

    hostname = parsed.hostname
    if not hostname:
        raise URLValidationError("URL must include a valid hostname.")

    hostname_lower = hostname.lower().rstrip(".")
    if not hostname_lower or len(hostname_lower) > 253:
        raise URLValidationError("URL hostname length is invalid.")

    # Validate port if present
    try:
        port = parsed.port
        if port is not None and not (1 <= port <= 65535):
            raise URLValidationError("URL port number must be between 1 and 65535.")
    except ValueError as exc:
        raise URLValidationError("URL contains an invalid port specification.") from exc

    # Check if IP literal or domain name
    if not is_ip_literal(hostname_lower):
        labels = hostname_lower.split(".")
        if len(labels) < 2 and hostname_lower != "localhost":
            raise URLValidationError(
                "URL hostname must include a valid top-level domain (e.g., example.com)."
            )
        for label in labels:
            if not label or not _HOSTNAME_LABEL_RE.match(label):
                raise URLValidationError(
                    f"URL hostname contains an invalid domain label: '{label}'."
                )
        # Ensure final TLD label is not purely numeric
        if len(labels) >= 2 and labels[-1].isdigit():
            raise URLValidationError("URL top-level domain cannot be purely numeric.")

    # Reconstruct with lowercase scheme; preserve original path/query for lexical fidelity
    normalized = urlunsplit(
        (
            scheme,
            parsed.netloc,
            parsed.path,
            parsed.query,
            parsed.fragment,
        )
    )
    return normalized


def extract_registrable_domain(hostname: str) -> str:
    """Extract the registrable base domain (e.g. 'sub.login.example.co.uk' -> 'example.co.uk')."""
    if not hostname:
        return ""
    host_clean = hostname.lower().strip().rstrip(".")
    if is_ip_literal(host_clean) or host_clean == "localhost":
        return host_clean

    labels = [lbl for lbl in host_clean.split(".") if lbl]
    if len(labels) <= 2:
        return host_clean

    last_two = f"{labels[-2]}.{labels[-1]}"
    if last_two in _MULTI_PART_TLDS and len(labels) >= 3:
        return f"{labels[-3]}.{last_two}"

    return last_two


def extract_subdomain_count(hostname: str) -> int:
    """Count the number of subdomain levels preceding the registrable domain."""
    if not hostname:
        return 0
    host_clean = hostname.lower().strip().rstrip(".")
    if is_ip_literal(host_clean) or host_clean == "localhost":
        return 0

    labels = [lbl for lbl in host_clean.split(".") if lbl]
    if len(labels) <= 2:
        return 0

    last_two = f"{labels[-2]}.{labels[-1]}"
    base_label_count = 3 if (last_two in _MULTI_PART_TLDS and len(labels) >= 3) else 2
    return max(0, len(labels) - base_label_count)


def redact_url_for_storage(url: str) -> str:
    """Redact sensitive query parameter values, userinfo credentials, and fragments.

    Example:
        'https://user:secret@example.com/reset?token=abc123&email=test@x.com#frag'
        -> 'https://[REDACTED]@example.com/reset?token=[REDACTED]&email=[REDACTED]#[REDACTED]'
    """
    try:
        parsed = urlsplit(url.strip())
    except ValueError:
        return "[MALFORMED_URL]"

    # Redact userinfo before '@' if present
    netloc = parsed.netloc
    if "@" in netloc:
        _, hostpart = netloc.rsplit("@", 1)
        netloc = f"[REDACTED]@{hostpart}"

    # Redact query parameter values while preserving parameter names
    redacted_query = ""
    if parsed.query:
        pairs = parse_qsl(parsed.query, keep_blank_values=True)
        if pairs:
            redacted_pairs = [
                f"{ re.sub(r'[^a-zA-Z0-9_.-]', '', k)[:64] or 'param' }=[REDACTED]"
                for k, _ in pairs
            ]
            redacted_query = "&".join(redacted_pairs)
        else:
            redacted_query = "[REDACTED]"

    redacted_fragment = "[REDACTED]" if parsed.fragment else ""

    return urlunsplit(
        (
            parsed.scheme.lower() if parsed.scheme else "http",
            netloc,
            parsed.path,
            redacted_query,
            redacted_fragment,
        )
    )
