# Model Evaluation Report — PhishGuard AI

**Project Name:** PhishGuard AI  
**Active Model Version:** `v1.0.0` (`XGBoost`)  
**Artifact Location:** [`backend/app/ml/artifacts/v1/`](../backend/app/ml/artifacts/v1/)  
**Status:** Phase 2 – Verified on Held-Out Unseen Test Data  

---

## 1. Executive Summary

Four candidate classification algorithms (**Logistic Regression**, **Decision Tree**, **Random Forest**, and **XGBoost**) were trained and tuned on `10,087` training URLs (`70%`), evaluated for hyperparameter and model selection on `2,162` validation URLs (`15%`), and benchmarked once on `2,162` unseen held-out test URLs (`15%`) extracted using the shared 24-feature pipeline ([`backend/app/services/feature_extraction.py`](../backend/app/services/feature_extraction.py)).

**Selected Production Model:** **XGBoost (`v1.0.0`)**
- **Held-Out Test Accuracy:** `90.70%` (`0.9070`)
- **Held-Out Test Precision (Phishing):** `90.35%` (`0.9035`)
- **Held-Out Test Recall (Phishing):** `91.10%` (`0.9110`)
- **Held-Out Test F1-Score:** `90.72%` (`0.9072`)
- **Held-Out Test ROC-AUC:** `96.74%` (`0.9674`)
- **Held-Out Test PR-AUC:** `96.77%` (`0.9677`)
- **Unseen-Domain Generalization (`GroupShuffleSplit`, 0 Domain Overlap):** `90.19%` Accuracy, `88.71%` F1-Score, `96.27%` ROC-AUC across `1,777` completely unseen registrable domains.

---

## 2. Candidate Model Comparison (Held-Out Test Set, $N = 2,162$)

| Model | Hyperparameters | Accuracy | Precision | Recall | F1-Score | ROC-AUC | PR-AUC | Selected |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| **XGBoost** | `n_estimators=300, max_depth=6, lr=0.1, subsample=0.85, colsample_bytree=0.85` | **0.9070** | **0.9035** | **0.9110** | **0.9072** | **0.9674** | **0.9677** | **Yes** |
| **Random Forest** | `n_estimators=300, max_depth=24, min_samples_leaf=2` | 0.9001 | 0.8891 | 0.9138 | 0.9013 | 0.9655 | 0.9656 | No |
| **Decision Tree** | `max_depth=12, min_samples_leaf=5` | 0.8599 | 0.8782 | 0.8350 | 0.8561 | 0.9256 | 0.9119 | No |
| **Logistic Regression** | `C=5.0, max_iter=1000, StandardScaler=True` | 0.8117 | 0.8401 | 0.7692 | 0.8031 | 0.9050 | 0.9120 | No |

### 2.1 Why XGBoost Was Selected
1. **Highest Validation & Test F1-Score:** Achieved `0.9228` F1 on validation and `0.9072` F1 on the unseen test set, outperforming Random Forest (`0.9013`), Decision Tree (`0.8561`), and Logistic Regression (`0.8031`).
2. **Superior Recall / Precision Balance:** Caught `91.10%` of phishing URLs while maintaining `90.35%` precision (reducing false positives by 18 cases compared to Random Forest on the test set).
3. **Strong Probability Calibration & Discrimination:** Achieved `0.9674` ROC-AUC and `0.9677` PR-AUC.

---

## 3. Confusion Matrix Analysis (XGBoost `v1.0.0`, Held-Out Test Set)

| | Predicted Legitimate (`0`) | Predicted Phishing (`1`) | Total |
| :--- | ---: | ---: | ---: |
| **Actual Legitimate (`0`)** | **TN = 978** (`90.30%`) | **FP = 105** (`9.70%`) | `1,083` |
| **Actual Phishing (`1`)** | **FN = 96** (`8.90%`) | **TP = 983** (`91.10%`) | `1,079` |
| **Total** | `1,074` | `1,088` | **`2,162`** |

### 3.1 Cybersecurity Impact of Errors
- **False Negatives ($FN = 96$, $FNR = 8.90\%$):** A false negative occurs when a real phishing URL is classified as legitimate. In cybersecurity, false negatives are the highest-severity risk because an unsuspecting user may proceed to enter credentials on a malicious site. PhishGuard AI mitigates this risk in two ways:
  1. **Three-Tier Decision Policy:** Borderline phishing scores in $[0.35, 0.65)$ are surfaced with an amber **Suspicious / Uncertain** warning rather than a green "Legitimate" badge.
  2. **Mandatory Safety Disclaimer:** Every scan result explicitly warns users that *"Machine learning predictions are estimates and cannot guarantee that a URL is safe."*
- **False Positives ($FP = 105$, $FPR = 9.70\%$):** A false positive occurs when a legitimate URL with complex query parameters, numeric tokens, or multiple subdomains is flagged as suspicious/phishing. While less dangerous than a false negative, excessive false positives cause alert fatigue.

---

## 4. Cross-Domain Generalization (`GroupShuffleSplit` by Registrable Domain)

To verify that the model learns generalizable lexical patterns rather than memorizing domain-specific artifacts, we evaluated the same architecture using `GroupShuffleSplit` grouped by `registrable_domain` (`7,107` training domains vs. `1,777` test domains, **0 overlapping domains**):

| Split Strategy | Accuracy | Precision | Recall | F1-Score | ROC-AUC | PR-AUC |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Stratified Unseen Test Split** | `0.9070` | `0.9035` | `0.9110` | `0.9072` | `0.9674` | `0.9677` |
| **Zero-Overlap Domain Split** | `0.9019` | `0.8868` | `0.8875` | `0.8871` | `0.9627` | `0.9544` |

The minimal drop (`-0.51%` accuracy, `-0.47%` ROC-AUC) when evaluated on `1,777` completely unseen registrable domains confirms that the 24 lexical features generalize reliably across new domains.

---

## 5. Global Feature Importance Ranking

| Rank | Feature Name | Label | Category | Relative Importance |
| :-: | :--- | :--- | :--- | ---: |
| 1 | `suspicious_keyword_count` | Suspicious Keyword Count | Deception & Obfuscation | `24.39%` |
| 2 | `hostname_digit_count` | Hostname Digit Count | Character Counts | `12.01%` |
| 3 | `subdomain_count` | Subdomain Depth | Domain & Protocol | `9.01%` |
| 4 | `is_https` | HTTPS Scheme Indicator | Domain & Protocol | `6.24%` |
| 5 | `digit_to_length_ratio` | Digit-to-Length Ratio | Character Counts | `5.25%` |
| 6 | `suspicious_hostname_pattern` | Suspicious Hostname Pattern | Deception & Obfuscation | `5.07%` |
| 7 | `at_symbol_present` | @ Symbol Indicator | Deception & Obfuscation | `4.00%` |
| 8 | `hyphen_count` | Total Hyphen Count (-) | Character Counts | `3.74%` |
| 9 | `slash_count` | Path Slash Count (/) | Character Counts | `3.62%` |
| 10 | `hostname_hyphen_count` | Hostname Hyphen Count | Character Counts | `3.52%` |
| 11 | `dot_count` | Dot Count (.) | Character Counts | `2.70%` |
| 12 | `digit_count` | Total Digit Count | Character Counts | `2.60%` |
| 13 | `path_length` | URL Path Length | Length & Structure | `2.57%` |
| 14 | `underscore_count` | Underscore Count (_) | Character Counts | `2.46%` |
| 15 | `domain_length` | Registrable Domain Length | Length & Structure | `1.89%` |

> **Interpretability Note:** Global feature importance measures how much each feature reduced impurity across all decision trees during training. It does not prove causal reasoning for a single URL prediction.
