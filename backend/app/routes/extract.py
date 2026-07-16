"""
extract.py — FastAPI route for POST /api/extract-requirements

Accepts document names + text (sent by the frontend) or falls back to
reading saved files from the uploads/ directory on disk.
"""
import os
import logging
import traceback
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.services.ai.schemas import ExtractionRequest, DocumentInput
from app.services.ai.requirement_extractor import extract_requirements

router = APIRouter()
logger = logging.getLogger("speclens.routes.extract")

# Uploads directory — same as used by upload.py
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")


def _read_text_from_disk(doc_name: str) -> str | None:
    """Try to read extracted text from the saved file on disk."""
    from app.services.parser import parse_document
    file_path = os.path.join(UPLOAD_DIR, doc_name)
    if os.path.exists(file_path):
        try:
            text = parse_document(file_path)
            logger.info(f"[EXTRACT ROUTE] Re-read '{doc_name}' from disk: {len(text)} chars")
            return text
        except Exception as e:
            logger.warning(f"[EXTRACT ROUTE] Could not re-read '{doc_name}': {e}")
    return None


@router.post("/extract-requirements")
async def extract_requirements_route(body: ExtractionRequest):
    """
    Accepts a list of documents (name + text) and returns
    structured software requirements extracted by Gemini Flash via LangChain.

    If a document's text is a short placeholder (from mock/demo files),
    the route automatically tries to read the real text from disk.
    """
    if not body.documents:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "No documents provided for extraction."}
        )

    logger.info(
        f"[ROUTE] /extract-requirements — {len(body.documents)} document(s): "
        f"{[d.name for d in body.documents]}"
    )

    # Enrich documents: if text is a placeholder, try to read from disk
    enriched_docs = []
    for doc in body.documents:
        text = doc.text.strip()
        # Heuristic: placeholder texts are short (< 300 chars) and bracketed
        is_placeholder = len(text) < 300 and text.startswith('[Document:')
        if is_placeholder:
            disk_text = _read_text_from_disk(doc.name)
            if disk_text:
                text = disk_text
                logger.info(f"[ROUTE] Replaced placeholder for '{doc.name}' with {len(text)} chars from disk")
            else:
                logger.warning(f"[ROUTE] Could not enrich '{doc.name}' — no disk file found, using placeholder")
        enriched_docs.append(DocumentInput(name=doc.name, text=text))

    try:
        result = extract_requirements(enriched_docs)
        logger.info(
            f"[ROUTE] Extraction complete — "
            f"{result['stats']['total_requirements']} requirements, "
            f"{result['stats']['elapsed_seconds']}s"
        )
        return {
            "success": True,
            "requirements": result["requirements"],
            "stats": result["stats"]
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
        logger.error(f"[ROUTE] Extraction runtime error: {e}\n{tb}")
        return JSONResponse(
            status_code=422,
            content={"success": False, "stage": "AI Extraction", "error": str(e), "trace": tb}
        )
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"[ROUTE] Unexpected error: {e}\n{tb}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "stage": "Server", "error": str(e), "trace": tb}
        )
