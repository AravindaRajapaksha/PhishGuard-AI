"""Shared lexical and structural URL feature extraction module.

CRITICAL ENGINEERING RULE:
This exact module must be used during offline dataset preparation, model training,
offline evaluation, and real-time FastAPI inference to guarantee zero
training-serving skew.

All feature extraction operates purely in-memory on the URL string without making
any outbound DNS, HTTP, HTTPS, or socket requests.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any
from urllib.parse import parse_qsl, urlsplit

from app.utils.url_sanitizer import (
    extract_registrable_domain,
    extract_subdomain_count,
    is_ip_literal,
)

# Canonical ordered list of the 24 URL features used by PhishGuard AI models
FEATURE_NAMES: list[str] = [
    "url_length",
    "hostname_length",
    "domain_length",
    "path_length",
    "query_length",
    "dot_count",
    "hyphen_count",
    "hostname_hyphen_count",
    "underscore_count",
    "slash_count",
    "digit_count",
    "hostname_digit_count",
    "special_char_count",
    "at_symbol_present",
    "subdomain_count",
    "is_https",
    "is_ip_address",
    "has_punycode",
    "suspicious_keyword_count",
    "query_param_count",
    "url_entropy",
    "hostname_entropy",
    "digit_to_length_ratio",
    "suspicious_hostname_pattern",
]

FEATURE_METADATA: dict[str, dict[str, str]] = {
    "url_length": {
        "label": "Total URL Length",
        "category": "Length & Structure",
        "description": "Total number of characters in the full URL string.",
    },
    "hostname_length": {
        "label": "Hostname Length",
        "category": "Length & Structure",
        "description": "Character length of the full hostname (including subdomains).",
    },
    "domain_length": {
        "label": "Registrable Domain Length",
        "category": "Length & Structure",
        "description": "Character length of the base registrable domain.",
    },
    "path_length": {
        "label": "URL Path Length",
        "category": "Length & Structure",
        "description": "Character length of the resource path component.",
    },
    "query_length": {
        "label": "Query String Length",
        "category": "Length & Structure",
        "description": "Character length of the query parameter string.",
    },
    "dot_count": {
        "label": "Dot Count (.)",
        "category": "Character Counts",
        "description": "Total number of dot ('.') characters in the URL.",
    },
    "hyphen_count": {
        "label": "Total Hyphen Count (-)",
        "category": "Character Counts",
        "description": "Total number of hyphen ('-') characters across the URL.",
    },
    "hostname_hyphen_count": {
        "label": "Hostname Hyphen Count",
        "category": "Character Counts",
        "description": "Number of hyphen ('-') characters inside the hostname.",
    },
    "underscore_count": {
        "label": "Underscore Count (_)",
        "category": "Character Counts",
        "description": "Total number of underscore ('_') characters in the URL.",
    },
    "slash_count": {
        "label": "Path Slash Count (/)",
        "category": "Character Counts",
        "description": "Number of forward slashes ('/') in the URL path.",
    },
    "digit_count": {
        "label": "Total Digit Count",
        "category": "Character Counts",
        "description": "Total count of numeric digits (0-9) in the URL.",
    },
    "hostname_digit_count": {
        "label": "Hostname Digit Count",
        "category": "Character Counts",
        "description": "Count of numeric digits (0-9) inside the hostname.",
    },
    "special_char_count": {
        "label": "Special Character Count",
        "category": "Character Counts",
        "description": "Count of special URI symbols (?, =, &, %, @, ~, +, $, !, *, ;).",
    },
    "at_symbol_present": {
        "label": "@ Symbol Indicator",
        "category": "Deception & Obfuscation",
        "description": "Indicates presence of '@' credential/redirection symbol (1 = present, 0 = absent).",
    },
    "subdomain_count": {
        "label": "Subdomain Depth",
        "category": "Domain & Protocol",
        "description": "Number of subdomain levels preceding the registrable domain.",
    },
    "is_https": {
        "label": "HTTPS Scheme Indicator",
        "category": "Domain & Protocol",
        "description": "Indicates whether the URL uses the HTTPS scheme (1 = https, 0 = http). Note: HTTPS does not imply a website is safe.",
    },
    "is_ip_address": {
        "label": "IP Literal Hostname",
        "category": "Domain & Protocol",
        "description": "Indicates whether the hostname is a raw IPv4/IPv6 address instead of a domain name.",
    },
    "has_punycode": {
        "label": "Punycode (IDN) Indicator",
        "category": "Deception & Obfuscation",
        "description": "Detects 'xn--' internationalized domain encoding often abused in homograph attacks.",
    },
    "suspicious_keyword_count": {
        "label": "Suspicious Keyword Count",
        "category": "Deception & Obfuscation",
        "description": "Count of authentication, urgency, or brand-lure keywords in the URL.",
    },
    "query_param_count": {
        "label": "Query Parameter Count",
        "category": "Length & Structure",
        "description": "Number of key-value parameters present in the URL query string.",
    },
    "url_entropy": {
        "label": "URL Shannon Entropy",
        "category": "Deception & Obfuscation",
        "description": "Information entropy (bits/char) measuring randomness across the full URL.",
    },
    "hostname_entropy": {
        "label": "Hostname Shannon Entropy",
        "category": "Deception & Obfuscation",
        "description": "Information entropy (bits/char) measuring randomness in the hostname.",
    },
    "digit_to_length_ratio": {
        "label": "Digit-to-Length Ratio",
        "category": "Character Counts",
        "description": "Proportion of numeric characters relative to total URL length.",
    },
    "suspicious_hostname_pattern": {
        "label": "Suspicious Hostname Pattern",
        "category": "Deception & Obfuscation",
        "description": "Composite indicator for deceptive hostname structures (embedded TLD tokens, excessive hyphens, or high-risk TLD + lure combinations).",
    },
}

# Curated list of lexical tokens frequently abused in phishing URLs
SUSPICIOUS_KEYWORDS: tuple[str, ...] = (
    "login",
    "signin",
    "sign-in",
    "logon",
    "verify",
    "verification",
    "secure",
    "account",
    "update",
    "confirm",
    "banking",
    "password",
    "passwd",
    "credential",
    "wallet",
    "recover",
    "recovery",
    "unlock",
    "suspend",
    "suspended",
    "billing",
    "invoice",
    "authenticate",
    "webscr",
    "auth",
    "helpdesk",
    "validate",
    "office365",
    "onedrive",
    "sharepoint",
    "icloud",
    "paypal",
    "appleid",
    "metamask",
    "binance",
    "coinbase",
)

_TOKEN_SPLIT_RE = re.compile(r"[^a-z0-9]+")

# High-risk or commonly abused low-cost/free TLDs when paired with suspicious tokens
_ABUSED_TLDS: set[str] = {
    "xyz",
    "top",
    "club",
    "online",
    "site",
    "vip",
    "icu",
    "buzz",
    "work",
    "click",
    "link",
    "live",
    "shop",
    "rest",
    "fit",
    "tk",
    "ml",
    "ga",
    "cf",
    "gq",
    "cn",
    "ru",
    "su",
    "pw",
    "cc",
    "sbs",
    "cfd",
    "cyou",
}

_SPECIAL_CHARS: set[str] = set("?=&#%@~+$!*;:")

# Regex detecting embedded TLD-like tokens inside subdomains (e.g. paypal.com-login.example.xyz or paypal.com.example.org)
_EMBEDDED_TLD_IN_SUBDOMAIN_RE = re.compile(
    r"(?:^|[.-])(com|net|org|gov|edu|co|bank)(?:[.-])", re.IGNORECASE
)


def calculate_shannon_entropy(text: str) -> float:
    """Compute Shannon entropy in bits per character for a string."""
    if not text:
        return 0.0
    length = len(text)
    counts = Counter(text)
    entropy = -sum((count / length) * math.log2(count / length) for count in counts.values())
    return round(entropy, 4)


def _count_suspicious_keywords(url_lower: str) -> tuple[int, list[str]]:
    """Return count and matched list of suspicious keywords found in the URL."""
    tokens = {t for t in _TOKEN_SPLIT_RE.split(url_lower) if t}
    matched: list[str] = []
    for kw in SUSPICIOUS_KEYWORDS:
        if len(kw) <= 5:
            if kw in tokens:
                matched.append(kw)
        elif kw in tokens or kw in url_lower:
            matched.append(kw)
    return len(matched), matched


def _detect_suspicious_hostname_pattern(
    hostname_lower: str,
    registrable_domain: str,
    subdomain_count: int,
    hostname_hyphen_count: int,
    matched_keywords: list[str],
) -> int:
    """Evaluate composite lexical deception patterns on the hostname."""
    if not hostname_lower:
        return 0

    # Pattern 1: Multiple hyphens (>= 2) in hostname or very long hostname (>= 32 chars)
    if hostname_hyphen_count >= 2 or len(hostname_lower) >= 32:
        return 1

    # Pattern 2: Embedded TLD token inside the prefix before registrable domain
    prefix = hostname_lower[: max(0, len(hostname_lower) - len(registrable_domain))].rstrip(".")
    if prefix and _EMBEDDED_TLD_IN_SUBDOMAIN_RE.search(prefix):
        return 1

    # Pattern 3: Deep subdomain nesting (>= 3 levels)
    if subdomain_count >= 3:
        return 1

    # Pattern 4: Abused TLD combined with either a hyphen, subdomain, or suspicious keyword
    tld = hostname_lower.rsplit(".", 1)[-1] if "." in hostname_lower else ""
    if tld in _ABUSED_TLDS and (
        hostname_hyphen_count >= 1 or subdomain_count >= 1 or len(matched_keywords) >= 1
    ):
        return 1

    return 0


def extract_url_features(url: str) -> dict[str, float | int]:
    """Extract all 24 lexical and structural features from a URL string.

    Args:
        url: Raw URL string (must have a scheme or will be parsed via urlsplit).

    Returns:
        Dictionary mapping each canonical feature name in FEATURE_NAMES to its numeric value.
    """
    cleaned = url.strip()
    # If a raw dataset row omits scheme, parse defensively with http:// fallback
    parse_target = cleaned if "://" in cleaned else f"http://{cleaned}"

    try:
        parsed = urlsplit(parse_target)
    except ValueError:
        parsed = urlsplit("http://invalid.local")

    scheme = (parsed.scheme or "http").lower()
    hostname = (parsed.hostname or "").lower().rstrip(".")
    path = parsed.path or ""
    query = parsed.query or ""

    registrable_domain = extract_registrable_domain(hostname)
    subdomain_count = extract_subdomain_count(hostname)

    url_length = len(cleaned)
    hostname_length = len(hostname)
    domain_length = len(registrable_domain)
    path_length = len(path)
    query_length = len(query)

    dot_count = cleaned.count(".")
    hyphen_count = cleaned.count("-")
    hostname_hyphen_count = hostname.count("-")
    underscore_count = cleaned.count("_")
    slash_count = path.count("/")

    digit_count = sum(1 for ch in cleaned if ch.isdigit())
    hostname_digit_count = sum(1 for ch in hostname if ch.isdigit())
    special_char_count = sum(1 for ch in cleaned if ch in _SPECIAL_CHARS)

    at_symbol_present = 1 if "@" in cleaned else 0
    is_https = 1 if scheme == "https" else 0
    is_ip_address = 1 if is_ip_literal(hostname) else 0
    has_punycode = 1 if "xn--" in hostname else 0

    url_lower = cleaned.lower()
    suspicious_keyword_count, matched_keywords = _count_suspicious_keywords(url_lower)

    if query:
        query_params = parse_qsl(query, keep_blank_values=True)
        query_param_count = max(1, len(query_params))
    else:
        query_param_count = 0

    url_entropy = calculate_shannon_entropy(cleaned)
    hostname_entropy = calculate_shannon_entropy(hostname)
    digit_to_length_ratio = round(digit_count / max(url_length, 1), 4)

    suspicious_hostname_pattern = _detect_suspicious_hostname_pattern(
        hostname_lower=hostname,
        registrable_domain=registrable_domain,
        subdomain_count=subdomain_count,
        hostname_hyphen_count=hostname_hyphen_count,
        matched_keywords=matched_keywords,
    )

    features: dict[str, float | int] = {
        "url_length": url_length,
        "hostname_length": hostname_length,
        "domain_length": domain_length,
        "path_length": path_length,
        "query_length": query_length,
        "dot_count": dot_count,
        "hyphen_count": hyphen_count,
        "hostname_hyphen_count": hostname_hyphen_count,
        "underscore_count": underscore_count,
        "slash_count": slash_count,
        "digit_count": digit_count,
        "hostname_digit_count": hostname_digit_count,
        "special_char_count": special_char_count,
        "at_symbol_present": at_symbol_present,
        "subdomain_count": subdomain_count,
        "is_https": is_https,
        "is_ip_address": is_ip_address,
        "has_punycode": has_punycode,
        "suspicious_keyword_count": suspicious_keyword_count,
        "query_param_count": query_param_count,
        "url_entropy": url_entropy,
        "hostname_entropy": hostname_entropy,
        "digit_to_length_ratio": digit_to_length_ratio,
        "suspicious_hostname_pattern": suspicious_hostname_pattern,
    }
    return features


def extract_feature_vector(url: str) -> list[float]:
    """Return the extracted URL features in the exact canonical order of FEATURE_NAMES."""
    feature_dict = extract_url_features(url)
    return [float(feature_dict[name]) for name in FEATURE_NAMES]


def generate_risk_signals(
    url: str, features: dict[str, float | int] | None = None
) -> list[dict[str, Any]]:
    """Generate human-understandable explanations of lexical signals observed in the URL.

    Note: These signals describe structural characteristics present in the URL and
    help explain what patterns the model evaluates. They do not constitute causal proof.
    """
    if features is None:
        features = extract_url_features(url)

    signals: list[dict[str, Any]] = []
    _, matched_keywords = _count_suspicious_keywords(url.lower())

    if int(features["is_ip_address"]) == 1:
        signals.append(
            {
                "id": "ip_hostname",
                "title": "IP Address Used Instead of Domain Name",
                "severity": "high",
                "feature": "is_ip_address",
                "value": 1,
                "description": (
                    "The URL points directly to a numeric IP address rather than a registered "
                    "domain name, a frequent pattern in ephemeral phishing infrastructure."
                ),
            }
        )

    if int(features["at_symbol_present"]) == 1:
        signals.append(
            {
                "id": "at_symbol_deception",
                "title": "Presence of '@' Credential / Redirection Symbol",
                "severity": "high",
                "feature": "at_symbol_present",
                "value": 1,
                "description": (
                    "Browsers treat text before '@' in the authority component as credentials "
                    "and navigate to the host after '@', a classic URL spoofing technique."
                ),
            }
        )

    if int(features["has_punycode"]) == 1:
        signals.append(
            {
                "id": "punycode_idn",
                "title": "Punycode (xn--) Internationalized Domain Detected",
                "severity": "high",
                "feature": "has_punycode",
                "value": 1,
                "description": (
                    "The hostname uses 'xn--' ASCII-compatible encoding, which can be abused in "
                    "IDN homograph attacks to visually mimic trusted brands."
                ),
            }
        )

    kw_count = int(features["suspicious_keyword_count"])
    if kw_count >= 1:
        severity = "high" if kw_count >= 2 else "medium"
        preview = ", ".join(f"'{k}'" for k in matched_keywords[:5])
        signals.append(
            {
                "id": "suspicious_keywords",
                "title": f"Contains Sensitive / Lure Keywords ({kw_count})",
                "severity": severity,
                "feature": "suspicious_keyword_count",
                "value": kw_count,
                "description": (
                    f"Detected lexical tokens commonly used in credential harvesting or urgency lures ({preview})."
                ),
            }
        )

    host_hyphens = int(features["hostname_hyphen_count"])
    if host_hyphens >= 2:
        signals.append(
            {
                "id": "hostname_hyphens",
                "title": f"Multiple Hyphens in Hostname ({host_hyphens})",
                "severity": "high" if host_hyphens >= 3 else "medium",
                "feature": "hostname_hyphen_count",
                "value": host_hyphens,
                "description": (
                    "Legitimate primary domains rarely contain multiple hyphens; combo-squatting "
                    "domains frequently chain brand and action words with hyphens."
                ),
            }
        )

    subdomains = int(features["subdomain_count"])
    if subdomains >= 2:
        signals.append(
            {
                "id": "deep_subdomains",
                "title": f"Multi-Level Subdomain Nesting ({subdomains} levels)",
                "severity": "high" if subdomains >= 3 else "medium",
                "feature": "subdomain_count",
                "value": subdomains,
                "description": (
                    "Deep subdomain chains are often used to place recognizable brand names at the "
                    "front of a URL while hiding the true registrable domain at the end."
                ),
            }
        )

    url_len = int(features["url_length"])
    if url_len >= 75:
        signals.append(
            {
                "id": "excessive_url_length",
                "title": f"Long URL Structure ({url_len} characters)",
                "severity": "high" if url_len >= 120 else "medium",
                "feature": "url_length",
                "value": url_len,
                "description": (
                    "Long URLs can conceal the destination hostname in mobile address bars or carry "
                    "nested redirect paths and encoded victim tracking tokens."
                ),
            }
        )

    if int(features["suspicious_hostname_pattern"]) == 1:
        signals.append(
            {
                "id": "suspicious_hostname_pattern",
                "title": "Deceptive Hostname Lexical Pattern",
                "severity": "high",
                "feature": "suspicious_hostname_pattern",
                "value": 1,
                "description": (
                    "The hostname exhibits high-risk structural patterns such as embedded TLD tokens "
                    "in subdomains, high-risk TLD combinations, or excessive length."
                ),
            }
        )

    entropy = float(features["url_entropy"])
    if entropy >= 4.55:
        signals.append(
            {
                "id": "high_url_entropy",
                "title": f"Elevated Character Entropy ({entropy:.2f} bits/char)",
                "severity": "medium",
                "feature": "url_entropy",
                "value": entropy,
                "description": (
                    "High Shannon entropy indicates elevated randomness, often caused by obfuscated "
                    "identifiers, cryptographic tokens, or algorithmically generated strings."
                ),
            }
        )

    if int(features["is_https"]) == 0:
        signals.append(
            {
                "id": "unencrypted_http",
                "title": "Unencrypted HTTP Scheme",
                "severity": "medium",
                "feature": "is_https",
                "value": 0,
                "description": (
                    "The URL uses plain 'http://' without transport encryption. Note that while lack of "
                    "HTTPS is a risk indicator, presence of 'https://' does not guarantee legitimacy."
                ),
            }
        )
    else:
        signals.append(
            {
                "id": "https_context_note",
                "title": "HTTPS Transport Present (Neutral Signal)",
                "severity": "info",
                "feature": "is_https",
                "value": 1,
                "description": (
                    "The URL uses 'https://'. Modern phishing sites routinely use valid TLS certificates, "
                    "so PhishGuard AI evaluates domain and path structure rather than relying on HTTPS alone."
                ),
            }
        )

    # If no high/medium risk signals fired, add a clean structural summary signal
    has_elevated = any(s["severity"] in {"high", "medium"} for s in signals)
    if not has_elevated:
        signals.insert(
            0,
            {
                "id": "clean_lexical_structure",
                "title": "Compact, Standard Lexical Structure",
                "severity": "low",
                "feature": "url_length",
                "value": url_len,
                "description": (
                    "The URL has a concise hostname, standard subdomain depth, and no detected "
                    "credential-lure keywords or obfuscation markers."
                ),
            },
        )

    return signals
