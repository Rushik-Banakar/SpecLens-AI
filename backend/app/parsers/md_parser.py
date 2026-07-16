def parse_md(file_path: str) -> str:
    """
    Reads plain text from a Markdown (.md) file, trying multiple encoding fallbacks.
    """
    encodings = ['utf-8', 'latin-1', 'cp1252']
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    raise ValueError("Unable to read Markdown file. Unsupported character encoding.")
