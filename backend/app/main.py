"""FastAPI application entry point for the SpecLens AI API."""

from __future__ import annotations

import logging
import os
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routes import collisions, duplicates, extract, upload
from app.services.ai.provider_manager import AllProvidersUnavailableError

load_dotenv()
settings.validate()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("speclens")

app = FastAPI(
    title="SpecLens AI API",
    description="FastAPI service for parsing documents and reviewing software projects.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(extract.router, prefix="/api")
app.include_router(collisions.router, prefix="/api")
app.include_router(duplicates.router, prefix="/api")


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    """Return a simple health check payload."""
    return {
        "status": "healthy",
        "service": "SpecLens AI API Engine",
    }


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Log and return structured validation errors."""
    logger.exception("Request validation failed on %s %s", request.method, request.url)
    body = await request.body()
    logger.error(
        "Validation body: %s\nErrors: %s",
        body.decode(errors="replace"),
        exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "stage": "Request Validation",
            "error": str(exc),
            "detail": exc.errors(),
            "body": body.decode(errors="replace"),
        },
    )


@app.exception_handler(AllProvidersUnavailableError)
async def all_providers_unavailable_exception_handler(
    request: Request,
    exc: AllProvidersUnavailableError,
) -> JSONResponse:
    """Return a 503 when every configured AI provider is unavailable."""
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "reason": "ALL_AI_PROVIDERS_UNAVAILABLE",
            "providers_attempted": exc.providers_attempted,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch unhandled exceptions and return a structured server error."""
    error_trace = traceback.format_exc()
    logger.error("Unhandled exception on %s %s:\n%s", request.method, request.url, error_trace)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "stage": "Server",
            "error": str(exc),
            "trace": error_trace,
        },
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
