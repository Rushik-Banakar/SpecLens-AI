"""FastAPI routes for document upload and parsing."""

from __future__ import annotations

import logging
import os
import traceback
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.parser import parse_document

router = APIRouter()
logger = logging.getLogger("speclens.upload")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".markdown"}


def get_readable_size(size_in_bytes: int) -> str:
    """Convert a byte count into a human-readable size string."""
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    if size_in_bytes < 1024 * 1024:
        return f"{size_in_bytes / 1024:.1f} KB"
    return f"{size_in_bytes / (1024 * 1024):.1f} MB"


@router.post("/upload")
async def upload_files(files: list[UploadFile] = File(...)) -> dict[str, Any]:
    """Upload, validate, persist, and parse one or more specification documents.

    Args:
        files: Multipart file uploads from the client.

    Returns:
        Success flag and parsed document metadata for each accepted file.

    Raises:
        HTTPException: For unsupported formats, oversized files, or parse failures.
    """
    logger.info("[UPLOAD] Received %d file(s)", len(files))
    logger.info("[STAGE] Upload received: %s", [file.filename for file in files if file.filename])
    parsed_documents: list[dict[str, Any]] = []

    for upload_file in files:
        filename = upload_file.filename or "(unnamed)"
        logger.info("[UPLOAD] Processing: %s", filename)

        if not upload_file.filename:
            continue

        _, extension = os.path.splitext(upload_file.filename)
        extension = extension.lower()
        logger.info("[VALIDATION] Extension: '%s'", extension)

        if extension not in SUPPORTED_EXTENSIONS:
            logger.warning("[VALIDATION] Rejected — unsupported format: %s", extension)
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unsupported format '{extension}' for file '{upload_file.filename}'. "
                    "Allowed: PDF, DOCX, TXT, MD"
                ),
            )

        logger.info("[READ] Reading file content for size check...")
        try:
            file_content = await upload_file.read()
            file_size = len(file_content)
            logger.info("[READ] File size: %s (%d bytes)", get_readable_size(file_size), file_size)
        except Exception as exc:
            error_trace = traceback.format_exc()
            logger.error("[READ] Failed to read file content:\n%s", error_trace)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to read uploaded file '{filename}': {exc}",
            ) from exc

        if file_size > MAX_FILE_SIZE_BYTES:
            logger.warning(
                "[VALIDATION] Rejected — exceeds 25MB: %s",
                get_readable_size(file_size),
            )
            raise HTTPException(
                status_code=413,
                detail=(
                    f"File '{upload_file.filename}' exceeds 25MB limit. "
                    f"(Size: {get_readable_size(file_size)})"
                ),
            )

        file_path = os.path.join(UPLOAD_DIR, upload_file.filename)
        logger.info("[SAVE] Writing to: %s", file_path)
        try:
            with open(file_path, "wb") as buffer:
                buffer.write(file_content)
            saved_size = os.path.getsize(file_path)
            logger.info("[SAVE] Saved OK — disk size: %d bytes", saved_size)
            if saved_size != file_size:
                raise RuntimeError(
                    f"Written file size mismatch: expected {file_size}, got {saved_size}"
                )
        except Exception as exc:
            error_trace = traceback.format_exc()
            logger.error("[SAVE] Failed to save file:\n%s", error_trace)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save file '{filename}': {exc}",
            ) from exc

        logger.info("[PARSER] Starting text extraction for: %s", upload_file.filename)
        logger.info("[STAGE] Document parsing started: %s", upload_file.filename)
        try:
            extracted_text = parse_document(file_path)
            text_length = len(extracted_text)
            logger.info(
                "[STAGE] Document parsing completed: %s (%d chars)",
                upload_file.filename,
                text_length,
            )
            logger.info("[PARSER] Extracted %d characters successfully", text_length)
            status = "Parsed Successfully"
        except Exception as exc:
            error_trace = traceback.format_exc()
            logger.error("[PARSER] Extraction failed:\n%s", error_trace)
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=422,
                detail={
                    "success": False,
                    "stage": "Document Parser",
                    "file": upload_file.filename,
                    "error": str(exc),
                    "trace": error_trace,
                },
            ) from exc

        parsed_documents.append(
            {
                "filename": upload_file.filename,
                "filetype": extension.lstrip(".").upper() if extension != ".markdown" else "MD",
                "size": get_readable_size(file_size),
                "text_length": text_length,
                "status": status,
            }
        )
        logger.info(
            "[DONE] %s -> %d chars, %s",
            upload_file.filename,
            text_length,
            get_readable_size(file_size),
        )

    logger.info("[UPLOAD] Completed — returning %d parsed document(s)", len(parsed_documents))
    return {
        "success": True,
        "documents": parsed_documents,
    }
