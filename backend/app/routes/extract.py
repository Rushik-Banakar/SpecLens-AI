"""FastAPI route for POST /api/extract-requirements."""

from __future__ import annotations

import logging
import os
import traceback
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.services.ai.provider_manager import AllProvidersUnavailableError
from app.services.ai.requirement_extractor import extract_requirements
from app.services.ai.schemas import DocumentInput, ExtractionRequest

router = APIRouter()
logger = logging.getLogger("speclens.routes.extract")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PLACEHOLDER_MAX_CHARS = 300
PLACEHOLDER_PREVIEW_CHARS = 300


def _read_text_from_disk(doc_name: str) -> str | None:
    """Re-parse an uploaded document from disk when available.

    Args:
        doc_name: Original uploaded filename.

    Returns:
        Parsed text if the file exists and parses successfully, otherwise None.
    """
    from app.services.parser import parse_document

    file_path = os.path.join(UPLOAD_DIR, doc_name)
    if not os.path.exists(file_path):
        return None
    try:
        text = parse_document(file_path)
        logger.info("[EXTRACT ROUTE] Re-read '%s' from disk: %d chars", doc_name, len(text))
        return text
    except Exception as exc:
        logger.warning("[EXTRACT ROUTE] Could not re-read '%s': %s", doc_name, exc)
        return None


def _is_placeholder_text(text: str) -> bool:
    """Return True when request text looks like a frontend upload placeholder."""
    return len(text) < PLACEHOLDER_MAX_CHARS and text.startswith("[Document:")


def _log_enrichment_debug(
    *,
    doc_name: str,
    is_placeholder: bool,
    file_path: str,
    file_exists: bool,
    incoming_text: str,
) -> None:
    """Emit structured debug logs for document enrichment decisions."""
    logger.debug("Document enrichment: name=%s placeholder=%s path=%s exists=%s", doc_name, is_placeholder, file_path, file_exists)
    logger.debug("Incoming text length=%d preview=%r", len(incoming_text), incoming_text[:PLACEHOLDER_PREVIEW_CHARS])


@router.post("/extract-requirements", response_model=None)
async def extract_requirements_route(body: ExtractionRequest) -> dict[str, Any] | JSONResponse:
    """Extract structured requirements from uploaded or inline document text.

    When the client sends short placeholder text, this route prefers on-disk
    parsed content from a prior upload when available.

    Args:
        body: Documents with filename and text payload.

    Returns:
        Extracted requirements and extraction statistics, or an error response.
    """
    try:
        if not body.documents:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "No documents provided for extraction."},
            )

        logger.info(
            "[ROUTE] /extract-requirements — %d document(s): %s",
            len(body.documents),
            [document.name for document in body.documents],
        )

        enriched_documents: list[DocumentInput] = []
        for document in body.documents:
            text = document.text.strip()
            is_placeholder = _is_placeholder_text(text)
            file_path = os.path.join(UPLOAD_DIR, document.name)
            file_exists = os.path.exists(file_path)
            _log_enrichment_debug(
                doc_name=document.name,
                is_placeholder=is_placeholder,
                file_path=file_path,
                file_exists=file_exists,
                incoming_text=text,
            )

            if file_exists:
                disk_text = _read_text_from_disk(document.name)
                if disk_text:
                    text = disk_text
                    logger.info(
                        "[ROUTE] Loaded '%s' from disk (%d chars) for extraction",
                        document.name,
                        len(text),
                    )
                else:
                    logger.warning(
                        "[ROUTE] File exists but could not parse '%s' from disk",
                        document.name,
                    )
                    return JSONResponse(
                        status_code=422,
                        content={
                            "success": False,
                            "stage": "Document Enrichment",
                            "error": (
                                f"Uploaded file '{document.name}' exists but could not be "
                                "parsed for extraction."
                            ),
                            "file_path": file_path,
                        },
                    )
            elif is_placeholder:
                logger.warning(
                    "[ROUTE] Could not enrich '%s' — no disk file found",
                    document.name,
                )
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "stage": "Document Enrichment",
                        "error": (
                            f"Document '{document.name}' was not found in uploads/. "
                            "Upload the file via POST /api/upload before extracting requirements."
                        ),
                        "file_path": file_path,
                    },
                )

            logger.debug("Text sent to LLM length=%d preview=%r", len(text), text[:PLACEHOLDER_PREVIEW_CHARS])
            enriched_documents.append(DocumentInput(name=document.name, text=text))

        extraction_result = extract_requirements(enriched_documents)
        logger.info(
            "[ROUTE] Extraction complete — %d requirements, %ss",
            extraction_result["stats"]["total_requirements"],
            extraction_result["stats"]["elapsed_seconds"],
        )
        return {
            "success": True,
            "requirements": extraction_result["requirements"],
            "stats": extraction_result["stats"],
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
    except Exception as exc:
        logger.exception("[ROUTE] Extraction failed: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(exc),
                "trace": traceback.format_exc(),
            },
        )
