import docx

def parse_docx(file_path: str) -> str:
    """
    Extracts text from paragraphs and tables of a DOCX document.
    """
    try:
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        
        # Extract text from tables if any
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    full_text.append(cell.text)
                    
        return "\n".join(full_text)
    except Exception as e:
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")
