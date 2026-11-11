"""Main FastAPI application entry point for PhishGuard AI."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import os

from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.routes import analytics, history, model, scan
from app.core.config import settings
from app.database.connection import get_db, init_db_and_sync_model_version
from app.database.schemas import HealthResponse
from app.ml.model_loader import ModelRegistry


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize database schema, sync active model metadata, and warm up the ML artifact."""
    init_db_and_sync_model_version()
    ModelRegistry.load(settings.MODEL_VERSION)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "An Intelligent Machine Learning-Based Phishing URL Detection System. "
        "Performs strictly passive lexical and structural URL analysis without visiting submitted URLs."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):  # type: ignore[no-untyped-def]
    path = request.scope.get("path", "")
    if path.startswith("/v1/"):
        request.scope["path"] = f"/api{path}"
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return clean, user-friendly validation errors without internal stack traces."""
    errors = exc.errors()
    first_msg = "Invalid request input."
    if errors:
        raw_msg = str(errors[0].get("msg", first_msg))
        if raw_msg.startswith("Value error, "):
            raw_msg = raw_msg.replace("Value error, ", "", 1)
        first_msg = raw_msg

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": first_msg},
    )


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, __: Exception) -> JSONResponse:
    """Prevent unexpected internal errors from exposing stack traces or file paths."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected internal server error occurred while processing the request."
        },
    )


app.include_router(scan.router)
app.include_router(history.router)
app.include_router(analytics.router)
app.include_router(model.router)

if os.getenv("VERCEL"):
    init_db_and_sync_model_version()


@app.get(
    "/api/v1/health",
    response_model=HealthResponse,
    tags=["System Health"],
    summary="Production health check for model and database readiness",
)
def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    """Verify that the ML model artifact is loaded and database connection is active."""
    model_loaded = False
    model_version = "unavailable"
    try:
        bundle = ModelRegistry.load(settings.MODEL_VERSION)
        model_loaded = True
        model_version = bundle.version
    except Exception:
        model_loaded = False

    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    overall_status = "healthy" if (model_loaded and db_connected) else "degraded"
    return HealthResponse(
        status=overall_status,
        app_name=settings.APP_NAME,
        app_version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        model_loaded=model_loaded,
        model_version=model_version,
        database_connected=db_connected,
    )


@app.get("/", tags=["System Health"], summary="API Root")
def root() -> dict[str, str]:
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "tagline": "Detect Threats. Protect Your Digital World.",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
