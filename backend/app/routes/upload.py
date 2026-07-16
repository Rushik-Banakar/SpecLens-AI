import os
import shutil
import logging
import traceback
from typing import List
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from app.services.parser import parse_document

router = APIRouter()
logger = logging.getLogger("speclens.upload")

# Ensure uploads directory is created in root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.txt', '.md', '.markdown'}

def get_readable_size(size_in_bytes: int) -> str:
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    elif size_in_bytes < 1024 * 1024:
        return f"{(size_in_bytes / 1024):.1f} KB"
    else:
        return f"{(size_in_bytes / (1024 * 1024)):.1f} MB"

@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    logger.info(f"[UPLOAD] Received {len(files)} file(s)")
    parsed_docs = []

    for file in files:
        filename = file.filename or "(unnamed)"
        logger.info(f"[UPLOAD] Processing: {filename}")

        if not file.filename:
            continue

        # --- Stage 1: Extension validation ---
        _, ext = os.path.splitext(file.filename)
        ext = ext.lower()
        logger.info(f"[VALIDATION] Extension: '{ext}'")

        if ext not in SUPPORTED_EXTENSIONS:
            logger.warning(f"[VALIDATION] Rejected — unsupported format: {ext}")
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format '{ext}' for file '{file.filename}'. Allowed: PDF, DOCX, TXT, MD"
            )

        # --- Stage 2: Read content & size validation ---
        logger.info(f"[READ] Reading file content for size check...")
        try:
            file_content = await file.read()
            file_size = len(file_content)
            logger.info(f"[READ] File size: {get_readable_size(file_size)} ({file_size} bytes)")
        except Exception as e:
            tb = traceback.format_exc()
            logger.error(f"[READ] Failed to read file content:\n{tb}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to read uploaded file '{filename}': {str(e)}"
            )

        if file_size > MAX_FILE_SIZE:
            logger.warning(f"[VALIDATION] Rejected — exceeds 25MB: {get_readable_size(file_size)}")
            raise HTTPException(
                status_code=413,
                detail=f"File '{file.filename}' exceeds 25MB limit. (Size: {get_readable_size(file_size)})"
            )

        # --- Stage 3: Save file to disk ---
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        logger.info(f"[SAVE] Writing to: {file_path}")
        try:
            # Write directly from the already-read content (avoids seek issues)
            with open(file_path, "wb") as buffer:
                buffer.write(file_content)
            saved_size = os.path.getsize(file_path)
            logger.info(f"[SAVE] Saved OK — disk size: {saved_size} bytes")
            if saved_size != file_size:
                logger.error(f"[SAVE] Size mismatch! Expected {file_size}, got {saved_size}")
                raise RuntimeError(f"Written file size mismatch: expected {file_size}, got {saved_size}")
        except Exception as e:
            tb = traceback.format_exc()
            logger.error(f"[SAVE] Failed to save file:\n{tb}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save file '{filename}': {str(e)}"
            )

        # --- Stage 4: Parse / text extraction ---
        logger.info(f"[PARSER] Starting text extraction for: {file.filename}")
        try:
            extracted_text = parse_document(file_path)
            text_length = len(extracted_text)
            logger.info(f"[PARSER] Extracted {text_length} characters successfully")
            status = "Parsed Successfully"
        except Exception as e:
            tb = traceback.format_exc()
            logger.error(f"[PARSER] Extraction failed:\n{tb}")
            # Clean up saved file
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=422,
                detail={
                    "success": False,
                    "stage": "Document Parser",
                    "file": file.filename,
                    "error": str(e),
                    "trace": tb
                }
            )

        # --- Stage 5: Build response ---
        doc_result = {
            "filename": file.filename,
            "filetype": ext.lstrip('.').upper() if ext != '.markdown' else 'MD',
            "size": get_readable_size(file_size),
            "text_length": text_length,
            "status": status
        }
        parsed_docs.append(doc_result)
        logger.info(f"[DONE] {file.filename} → {text_length} chars, {get_readable_size(file_size)}")

    logger.info(f"[UPLOAD] Completed — returning {len(parsed_docs)} parsed document(s)")
    return {
        "success": True,
        "documents": parsed_docs
    }
