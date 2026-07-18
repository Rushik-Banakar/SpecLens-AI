"""PDF text extraction using PyMuPDF."""

from __future__ import annotations

import fitz  # PyMuPDF


def parse_pdf(file_path: str) -> str:
    """Extract text from all pages of a PDF document.

    Args:
        file_path: Path to the PDF file.

    Returns:
        Concatenated page text separated by newlines.

    Raises:
        ValueError: If the PDF cannot be opened or parsed.
    """
    text = ""
    try:
        with fitz.open(file_path) as document:
            for page in document:
                text += page.get_text() + "\n"
    except Exception as exc:
        raise ValueError(f"Failed to extract text from PDF: {exc}") from exc
    return text
