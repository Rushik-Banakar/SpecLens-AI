"""
collisions.py — FastAPI route for POST /api/detect-collisions
"""
import logging
import traceback
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Any

from app.services.ai.collision_detector import detect_collisions

router = APIRouter()
logger = logging.getLogger("speclens.routes.collisions")


class RequirementItem(BaseModel):
    """Minimal requirement shape accepted by the collision engine."""
    id: str
    document: str
    category: str
    statement: str
    priority: str
    confidence: float = 0.8


class CollisionRequest(BaseModel):
    requirements: List[RequirementItem]


@router.post("/detect-collisions")
async def detect_collisions_route(body: CollisionRequest):
    """
    Accepts the structured requirements from Phase 4 and returns
    a structured collision report from the AI Collision Engine.
    """
    if not body.requirements:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "No requirements provided for collision detection."}
        )

    req_list = [r.model_dump() for r in body.requirements]
    logger.info(
        f"[ROUTE] /detect-collisions called with {len(req_list)} requirements"
    )

    try:
        result = detect_collisions(req_list)
        logger.info(
            f"[ROUTE] Collision detection complete — "
            f"{result['stats']['collisions_found']} collisions, "
            f"health={result['stats']['health_score']}, "
            f"{result['stats']['elapsed_seconds']}s"
        )
        return {
            "success": True,
            "collisions": result["collisions"],
            "stats": result["stats"],
        }

    except ValueError as e:
        tb = traceback.format_exc()
        logger.error(f"[ROUTE] Configuration error: {e}\n{tb}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "stage": "Configuration", "error": str(e), "trace": tb}
        )
    except RuntimeError as e:
        tb = traceback.format_exc()
        logger.error(f"[ROUTE] Runtime error: {e}\n{tb}")
        return JSONResponse(
            status_code=422,
            content={"success": False, "stage": "AI Collision Detection", "error": str(e), "trace": tb}
        )
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"[ROUTE] Unexpected error: {e}\n{tb}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "stage": "Server", "error": str(e), "trace": tb}
        )
