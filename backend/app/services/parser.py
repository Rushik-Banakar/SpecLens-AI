"""Unified document parsing facade used by upload and extraction routes."""

from __future__ import annotations

import logging

from app.services.ai.document_loader import load_uploaded_document

logger = logging.getLogger("speclens.parser")


def parse_document(file_path: str) -> str:
    """Parse an uploaded file and return extracted plain text.

    Args:
        file_path: Absolute or relative path to the uploaded document.

    Returns:
        Extracted document text with page/section breaks preserved.

    Raises:
        ValueError: If LangChain cannot load or parse the document.
    """
    try:
        logger.info("[STAGE] Document parsing started: %s", file_path)
        documents = load_uploaded_document(file_path)
        parsed_text = "\n\n".join(document.page_content for document in documents).strip()
        logger.info(
            "[STAGE] Document parsing completed: %s (%d chars)",
            file_path,
            len(parsed_text),
        )
        return parsed_text
    except Exception as exc:
        logger.exception("Parse failed for '%s'", file_path)
        raise ValueError(f"Failed to load document through LangChain: {exc}") from exc
