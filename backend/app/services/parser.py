import os
from app.parsers.pdf_parser import parse_pdf
from app.parsers.docx_parser import parse_docx
from app.parsers.txt_parser import parse_txt
from app.parsers.md_parser import parse_md

def parse_document(file_path: str) -> str:
    """
    Detects file format extension and routes it to the correct parser module.
    """
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    
    if ext == '.pdf':
        return parse_pdf(file_path)
    elif ext == '.docx':
        return parse_docx(file_path)
    elif ext == '.txt':
        return parse_txt(file_path)
    elif ext in ('.md', '.markdown'):
        return parse_md(file_path)
    else:
        raise ValueError(f"Unsupported extension: {ext}")
