# Dataset Card — PhishGuard AI

**Project Name:** PhishGuard AI  
**Document Version:** 1.0.0 (Phase 1 Template — To Be Populated with Exact Verified Figures in Phase 2)  
**Status:** Phase 1 – Template Ready for Phase 2 Dataset Acquisition  

---

## 1. Purpose of This Document

This Dataset Card documents the provenance, licensing, schema, quality audit, preprocessing steps, and known limitations of the raw-URL dataset used to train and evaluate the **PhishGuard AI** classification models.

> **Engineering Integrity Note:** In accordance with `AGENTS.md` and project rules, no fabricated numbers are entered in this Phase 1 template. All quantitative fields below will be populated directly from automated dataset verification scripts in **Phase 2**.

---

## 2. Dataset Provenance & Licensing

| Attribute | Details (To Be Verified in Phase 2) |
| :--- | :--- |
| **Dataset Name** | *Pending Phase 2 Acquisition & Verification* |
| **Primary Source / Repository** | *Pending Phase 2 Verification (e.g., UCI Machine Learning Repository — PhiUSIIL Phishing URL Dataset / verified open academic raw-URL corpus)* |
| **Authors / Maintainers** | *Pending Phase 2 Verification* |
| **License / Usage Terms** | *Pending Phase 2 Verification (Must be open/permissive academic or public dataset license, e.g., CC BY 4.0 / MIT)* |
| **Date Downloaded** | *Pending Phase 2 Execution* |
| **Dataset Format** | Raw URL strings with ground-truth binary classification labels (`phishing` / `legitimate`) |

### 2.1 Note on Pre-Engineered Feature Datasets (UCI Classic)
The classic 2015 *UCI Phishing Websites Dataset* (11,055 rows, 30 pre-encoded `{-1, 0, 1}` attributes) contains **only pre-engineered features** (including external WHOIS age, Google PageRank, web traffic, and DOM iframe indicators) and **does not contain raw URL strings**. Therefore:
- It **cannot** and **will not** be used to train the live PhishGuard AI URL scanner, which requires raw URL string feature extraction.
- The live scanner model will be trained strictly on a verified dataset containing **actual raw URLs** and verified ground-truth labels.

---

## 3. Dataset Statistics & Composition (Phase 2 Audit Record)

| Metric | Value (Populated in Phase 2) |
| :--- | :--- |
| **Total Records Downloaded** | `TBD in Phase 2` |
| **Records After Missing/Malformed Removal** | `TBD in Phase 2` |
| **Duplicate URLs Removed** | `TBD in Phase 2` |
| **Conflicting-Label URLs Removed** | `TBD in Phase 2` |
| **Final Cleaned Dataset Size** | `TBD in Phase 2` |
| **Final Legitimate URLs (`label = 0`)** | `TBD in Phase 2` |
| **Final Phishing URLs (`label = 1`)** | `TBD in Phase 2` |
| **Unique Registrable Domains** | `TBD in Phase 2` |

---

## 4. Available Columns & Schema

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `url` | `string` | Raw URL string (`http://` or `https://`) prior to feature extraction. |
| `label` | `int` (`0` or `1`) | Standardized target label: `0` = Legitimate, `1` = Phishing. |

*(Additional source columns from the raw download will be documented here in Phase 2.)*

---

## 5. Data Quality Audit & Preparation Pipeline

During Phase 2, the dataset preparation script will execute and log the following steps:

1. **Schema & Encoding Verification:** Confirm UTF-8 decoding and presence of raw URL and target columns.
2. **Null & Empty Filtering:** Drop rows where `url` or `label` is null or empty.
3. **Scheme & Parseability Normalization:** Ensure URLs are parseable by `urllib.parse.urlsplit` with valid `http`/`https` schemes and non-empty hostnames.
4. **Canonical Deduplication:** Remove exact duplicate URLs and conflicting-label entries prior to train/validation/test splitting to prevent data leakage.
5. **Split Partitioning:**
   - **Training Split (70%):** Used to fit scalers and train candidate models.
   - **Validation Split (15%):** Used for hyperparameter selection and decision threshold calibration.
   - **Held-Out Test Split (15%):** Used strictly once for final unbiased evaluation reporting.
   - **Domain-Grouped Evaluation Split:** Evaluated separately using `GroupShuffleSplit` on registrable domains to measure cross-domain generalization.

---

## 6. Known Limitations & Ethical Considerations

1. **Temporal Drift in Phishing Campaigns:** Phishing kits evolve rapidly (new TLDs, URL shorteners, cloud-hosted subdomains). Static datasets reflect the threat landscape at collection time.
2. **Survivorship & Collection Bias:** Public phishing feeds (such as PhishTank or OpenPhish) predominantly capture reported English-language and financial/tech brand phishing campaigns, whereas legitimate URL lists are often sampled from top-ranking domain lists (e.g., Tranco/Majestic/Common Crawl). This can create structural artifacts (e.g., root homepage URLs vs. deep path URLs) that must be carefully analyzed and mitigated during feature engineering and preprocessing.
3. **Lexical Analysis Boundaries:** Lexical URL features alone cannot inspect page content, JavaScript behavior, or server-side redirects on newly compromised legitimate domains.
