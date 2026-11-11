"""Vercel Python Serverless Function entrypoint for the PhishGuard AI FastAPI backend."""

from __future__ import annotations

from pathlib import Path
import sys

from fastapi import FastAPI  # noqa: F401

_CURRENT_DIR = Path(__file__).resolve().parent
_LOCAL_BACKEND = _CURRENT_DIR / "_backend"
_REPO_BACKEND = _CURRENT_DIR.parents[1] / "backend"

if _LOCAL_BACKEND.exists() and str(_LOCAL_BACKEND) not in sys.path:
    sys.path.insert(0, str(_LOCAL_BACKEND))
elif _REPO_BACKEND.exists() and str(_REPO_BACKEND) not in sys.path:
    sys.path.insert(0, str(_REPO_BACKEND))

from app.main import app  # noqa: E402

__all__ = ["app"]
