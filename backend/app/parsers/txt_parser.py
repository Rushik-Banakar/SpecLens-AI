"""Plain-text file reader with encoding fallbacks."""

from __future__ import annotations

_FALLBACK_ENCODINGS = ("utf-8", "latin-1", "cp1252")


def parse_txt(file_path: str) -> str:
    """Read a TXT file using common encoding fallbacks.

    Args:
        file_path: Path to the text file.

    Returns:
        File contents as a string.

    Raises:
        ValueError: If the file cannot be decoded with any supported encoding.
    """
    for encoding in _FALLBACK_ENCODINGS:
        try:
            with open(file_path, "r", encoding=encoding) as file_handle:
                return file_handle.read()
        except UnicodeDecodeError:
            continue
    raise ValueError("Unable to read TXT file. Unsupported character encoding.")
