import fitz  # PyMuPDF

def parse_pdf(file_path: str) -> str:
    """
    Extracts text from all pages of a PDF document.
    """
    text = ""
    try:
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text() + "\n"
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    return text
