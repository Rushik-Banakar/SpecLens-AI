"""FastAPI route for POST /api/detect-duplicates."""

from __future__ import annotations

import logging
import traceback
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.ai.duplicate_detector import detect_duplicates
from app.services.ai.provider_manager import AllProvidersUnavailableError

router = APIRouter()
logger = logging.getLogger("speclens.routes.duplicates")


class RequirementItem(BaseModel):
    """Minimal requirement shape accepted by the duplicate engine."""

    id: str
    document: str
    category: str
    statement: str
    priority: str
    confidence: float = 0.8


class DuplicateRequest(BaseModel):
    """Request body for duplicate detection."""

    requirements: list[RequirementItem]


@router.post("/detect-duplicates", response_model=None)
async def detect_duplicates_route(
    body: DuplicateRequest,
) -> dict[str, Any] | JSONResponse:
    """Detect duplicate or near-duplicate requirements across documents.

    Args:
        body: Structured requirements produced by the extraction pipeline.

    Returns:
        Duplicate findings and analysis statistics.
    """
    if not body.requirements:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "No requirements provided for duplicate detection."},
        )

    requirement_list = [requirement.model_dump() for requirement in body.requirements]
    logger.info("[ROUTE] /detect-duplicates called with %d requirements", len(requirement_list))

    try:
        logger.info(
            "[STAGE] Duplicate detection started: analysing %d requirements",
            len(requirement_list),
        )
        detection_result = detect_duplicates(requirement_list)

        logger.info(
            "[STAGE] Duplicate detection completed: found %d duplicates",
            detection_result["stats"]["duplicates_found"],
        )
        logger.info(
            "[ROUTE] Duplicate detection complete — %d duplicates, %ss",
            detection_result["stats"]["duplicates_found"],
            detection_result["stats"]["elapsed_seconds"],
        )
        return {
            "success": True,
            "duplicates": detection_result["duplicates"],
            "stats": detection_result["stats"],
        }

    except AllProvidersUnavailableError as exc:
        logger.error("[ROUTE] All AI providers failed: %s", exc.providers_attempted)
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "reason": "ALL_AI_PROVIDERS_UNAVAILABLE",
                "providers_attempted": exc.providers_attempted,
            },
        )
    except ValueError as exc:
        error_trace = traceback.format_exc()
        logger.exception("[ROUTE] Configuration error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"success": False, "stage": "Configuration", "error": str(exc), "trace": error_trace},
        )
    except RuntimeError as exc:
        error_trace = traceback.format_exc()
        logger.exception("[ROUTE] Runtime error: %s", exc)
        return JSONResponse(
            status_code=422,
            content={"success": False, "stage": "AI Duplicate Detection", "error": str(exc), "trace": error_trace},
        )
    except Exception as exc:
        error_trace = traceback.format_exc()
        logger.exception("[ROUTE] Unexpected error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"success": False, "stage": "Server", "error": str(exc), "trace": error_trace},
        )
