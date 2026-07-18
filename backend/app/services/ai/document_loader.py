"""LangChain document-loader adapters for supported uploaded file types."""

from __future__ import annotations

from pathlib import Path

from langchain_community.document_loaders import (
    Docx2txtLoader,
    PyMuPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)
from langchain_core.documents import Document


def load_uploaded_document(file_path: str) -> list[Document]:
    """Load one supported upload and retain its original filename as metadata."""
    path = Path(file_path)
    extension = path.suffix.lower()
    if extension == ".pdf":
        loader = PyMuPDFLoader(str(path))
    elif extension == ".docx":
        loader = Docx2txtLoader(str(path))
    elif extension == ".txt":
        loader = TextLoader(str(path), autodetect_encoding=True)
    elif extension in {".md", ".markdown"}:
        loader = UnstructuredMarkdownLoader(str(path), mode="single")
    else:
        raise ValueError(f"Unsupported extension: {extension}")
    documents = loader.load()
    if not documents:
        raise ValueError(f"No readable content found in '{path.name}'.")
    for document in documents:
        document.metadata["source"] = path.name
        document.metadata["filename"] = path.name
    return documents
