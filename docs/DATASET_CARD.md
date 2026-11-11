# Dataset Card — PhishGuard AI

**Project Name:** PhishGuard AI  
**Document Version:** 2.0.0 (Verified & Populated from Phase 2 Execution)  
**Status:** Phase 2 – Verified  

---

## 1. Dataset Overview & Provenance

PhishGuard AI's URL classification pipeline is trained and evaluated on a verified corpus of **14,411 cleaned raw URLs** drawn from two peer-reviewed cybersecurity benchmark datasets licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**:

| Attribute | Details |
| :--- | :--- |
| **Primary Benchmark Dataset** | **Web Page Phishing Detection Benchmark Dataset (Hannousse & Yahiouche, 2021)** |
| **Primary Citation** | A. Hannousse and S. Yahiouche, *"Towards benchmark datasets for machine learning based website phishing detection: An experimental study,"* *Engineering Applications of Artificial Intelligence*, vol. 104, p. 104347, 2021. ([arXiv:2010.12847](https://arxiv.org/abs/2010.12847)) |
| **Secondary Supplement** | **UCI PhiUSIIL Phishing URL Dataset (Prasad & Chandra, 2024)** — UCI ML Repository ID `967` |
| **Secondary Citation** | A. Prasad and S. Chandra, *"PhiUSIIL: A diverse security profile empowered phishing URL detection framework based on similarity index and incremental learning,"* *Computers & Security*, vol. 136, p. 103545, 2024. |
| **License / Usage Terms** | **CC BY 4.0** (Permits sharing, adaptation, academic and commercial use with attribution) |
| **Records Downloaded** | `11,430` raw URLs from Hannousse & Yahiouche (2021) + `3,000` path-matched root URLs (`1,500` legitimate, `1,500` phishing) from UCI PhiUSIIL (2024) = **`14,430` raw URLs** |

---

## 2. Critical EDA Finding & Bias Mitigation

During exploratory data analysis in Phase 2, we audited the full 235,795-row **UCI PhiUSIIL Phishing URL Dataset** (`PhiUSIIL_Phishing_URL_Dataset.csv`) and discovered two vital properties:
1. **Inverted Label Convention in Raw PhiUSIIL:** In the raw UCI CSV, `label = 1` (`134,850` rows) denotes **Legitimate** URLs and `label = 0` (`100,945` rows) denotes **Phishing** URLs. We standardized all labels to PhishGuard AI's canonical convention (`0` = Legitimate, `1` = Phishing).
2. **Path-Length Collection Artifact in Raw PhiUSIIL:** Every single legitimate URL in PhiUSIIL (`134,850 / 134,850`) is a root homepage (`path_length = 0`), whereas `27,451` phishing URLs contain subpaths (`path_length > 0`). Training naively on the full PhiUSIIL dataset causes tree models to learn a spurious shortcut (`path_length > 0` $\Rightarrow$ Phishing), which falsely flags legitimate subpages (e.g., `https://www.wikipedia.org/wiki/Machine_learning`).

**Mitigation Applied:**
- We used the **Hannousse & Yahiouche (2021)** benchmark corpus (`11,430` raw URLs: `5,715` legitimate and `5,715` phishing) as our core dataset because both classes contain balanced distributions of root domains and deep resource paths (legitimate median path length = `14.0` chars, 75th percentile = `31.0` chars; phishing median path length = `19.0` chars, 75th percentile = `35.0` chars).
- We supplemented it with a strictly **path-matched root-URL sample (`3,000` URLs: `1,500` legitimate root URLs and `1,500` phishing root URLs, both with `path_length = 0`)** from **UCI PhiUSIIL (2024)** to incorporate modern abused TLDs (`.xyz`, `.top`, `.gq`, `.cf`, `.ru`) without introducing any path-length shortcut bias.

---

## 3. Verified Dataset Audit Statistics

All figures below were generated programmatically by `clean_and_deduplicate_dataset()` in [`backend/app/ml/preprocessing.py`](../backend/app/ml/preprocessing.py):

| Audit Metric | Verified Count |
| :--- | ---: |
| **Total Raw Records Loaded** | `14,430` |
| **Missing or Malformed Records Removed** | `1` |
| **Canonical Duplicate URLs Removed** | `18` |
| **Conflicting-Label URLs Removed** | `0` |
| **Final Cleaned Dataset Size** | **`14,411`** |
| **Final Legitimate URLs (`label = 0`)** | `7,214` (`50.06%`) |
| **Final Phishing URLs (`label = 1`)** | `7,197` (`49.94%`) |
| **Unique Registrable Domains** | `8,884` |
| **Stratified Training Split (`70%`)** | `10,087` |
| **Stratified Validation Split (`15%`)** | `2,162` |
| **Stratified Held-Out Test Split (`15%`)** | `2,162` |
| **Domain-Grouped Split (`GroupShuffleSplit 80/20`)** | `7,107` train domains / `1,777` unseen test domains (`0` overlap) |

---

## 4. Schema & Feature Extraction Pipeline

### 4.1 Raw Cleaned Schema
- `url` (`str`): Normalized raw URL string (`http://` or `https://`).
- `label` (`int`): Ground-truth binary class (`0` = Legitimate, `1` = Phishing).
- `hostname` (`str`): Lowercase extracted hostname.
- `registrable_domain` (`str`): Base registrable domain used for `GroupShuffleSplit` anti-leakage evaluation.

### 4.2 Extracted Feature Vector (24 Features)
All 24 features are computed purely from `url` via [`backend/app/services/feature_extraction.py`](../backend/app/services/feature_extraction.py):
`url_length`, `hostname_length`, `domain_length`, `path_length`, `query_length`, `dot_count`, `hyphen_count`, `hostname_hyphen_count`, `underscore_count`, `slash_count`, `digit_count`, `hostname_digit_count`, `special_char_count`, `at_symbol_present`, `subdomain_count`, `is_https`, `is_ip_address`, `has_punycode`, `suspicious_keyword_count`, `query_param_count`, `url_entropy`, `hostname_entropy`, `digit_to_length_ratio`, and `suspicious_hostname_pattern`.

---

## 5. Known Limitations

1. **Static Lexical Scope:** Because PhishGuard AI is a passive URL analyzer that never visits or resolves URLs, it cannot inspect page HTML, visual brand logos, JavaScript obfuscation, or newly compromised pages hosted on otherwise benign domains with clean URL slugs.
2. **Evolving Threat Patterns:** Attackers regularly shift toward new TLDs, cloud storage hosting, and URL shorteners. Periodic retraining on fresh threat feeds is recommended in production deployments.
