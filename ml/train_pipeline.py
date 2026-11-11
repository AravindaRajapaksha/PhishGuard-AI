"""Top-level ML pipeline runner for PhishGuard AI.

Executes the reproducible training and evaluation pipeline in `backend/app/ml/train.py`
and exports the evaluation summary to `ml/evaluation_summary.json`.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.ml.train import run_training_pipeline  # noqa: E402


def main() -> None:
    metadata = run_training_pipeline()
    summary_path = Path(__file__).resolve().parent / "evaluation_summary.json"
    with open(summary_path, "w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=2)
    print(f"Exported evaluation summary to {summary_path}")


if __name__ == "__main__":
    main()
