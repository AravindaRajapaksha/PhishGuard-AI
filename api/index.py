"""Root Vercel Python Serverless Function entrypoint for PhishGuard AI."""

from __future__ import annotations

from pathlib import Path
import sys

from fastapi import FastAPI  # noqa: F401

_BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.main import app  # noqa: E402

__all__ = ["app"]
