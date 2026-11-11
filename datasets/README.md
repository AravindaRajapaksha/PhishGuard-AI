# PhishGuard AI — Datasets Directory

This directory contains dataset documentation, verification samples, and data preparation references for **PhishGuard AI**.

## Verified Training & Evaluation Corpus

- **Primary Corpus:** *Web Page Phishing Detection Benchmark Dataset* (Hannousse & Yahiouche, *Engineering Applications of Artificial Intelligence*, Vol. 104, 2021) — `11,430` raw URLs (`5,715` legitimate, `5,715` phishing), **CC BY 4.0**.
- **Secondary Supplement:** *UCI PhiUSIIL Phishing URL Dataset* (Prasad & Chandra, *Computers & Security*, Vol. 136, 2024, UCI ID `967`) — `3,000` path-matched root URLs (`1,500` legitimate, `1,500` phishing), **CC BY 4.0**.
- **Final Cleaned & Deduplicated Dataset:** `14,411` raw URLs (`7,214` legitimate, `7,197` phishing) spanning `8,884` unique registrable domains.

See [`../docs/DATASET_CARD.md`](../docs/DATASET_CARD.md) for the complete dataset audit, bias analysis, and preprocessing specification.
