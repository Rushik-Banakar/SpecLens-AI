"""
requirement_extractor.py — Core AI extraction engine.

Uses LangChain + Google Gemini Flash to convert raw document text into
structured Requirement objects. Includes automatic retry on malformed JSON.
"""
import os
import json
import time
import logging
import re
from typing import List

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from app.services.ai.prompts import EXTRACTION_PROMPT_TEMPLATE, SYSTEM_CONTEXT
from app.services.ai.schemas import Requirement, DocumentInput

logger = logging.getLogger("speclens.extractor")

# ---------------------------------------------------------------------------
# Token budgeting — Gemini Flash has a generous context window but we still
# truncate very large documents to avoid hitting limits and keep latency low.
# ---------------------------------------------------------------------------
MAX_CHARS_PER_DOC = 40_000   # ~10k tokens per doc (rough 4 chars/token)
REQ_ID_OFFSET_PER_DOC = 100  # Keeps REQ IDs globally unique across docs


def _get_llm() -> ChatGoogleGenerativeAI:
    """Initialise the Gemini Flash LLM via LangChain."""
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY is not set. "
            "Add it to backend/.env as GOOGLE_API_KEY=your_key_here"
        )
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=api_key,
        temperature=0.1,      # Low temp = consistent, deterministic output
        max_output_tokens=8192,
    )


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers the model may emit."""
    text = text.strip()
    # Remove ```json or ``` at start
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    # Remove ``` at end
    text = re.sub(r'\s*```\s*$', '', text)
    return text.strip()


def _parse_requirements_json(raw: str, document_name: str, id_offset: int) -> List[Requirement]:
    """
    Parse the LLM JSON output into Requirement objects.
    Raises ValueError if parsing fails after cleanup attempts.
    """
    cleaned = _strip_markdown_fences(raw)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Attempt to find JSON object within surrounding text
        match = re.search(r'\{[\s\S]*"requirements"[\s\S]*\}', cleaned)
        if match:
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                raise ValueError(f"Could not parse JSON from LLM output: {e}\nRaw: {cleaned[:500]}")
        else:
            raise ValueError(f"No valid JSON found in LLM output: {e}\nRaw: {cleaned[:500]}")

    raw_reqs = data.get("requirements", [])
    requirements: List[Requirement] = []

    for i, req in enumerate(raw_reqs):
        # Ensure globally unique IDs by incorporating document offset
        req_id = f"REQ-{id_offset + i + 1:03d}"
        # Override whatever ID the LLM assigned
        req["id"] = req_id
        # Ensure document name is correct
        req["document"] = document_name
        # Clamp confidence
        req["confidence"] = max(0.0, min(1.0, float(req.get("confidence", 0.75))))
        # Validate and append
        try:
            requirements.append(Requirement(**req))
        except Exception as e:
            logger.warning(f"Skipping malformed requirement at index {i}: {e} — {req}")

    return requirements


def _extract_from_document(
    llm: ChatGoogleGenerativeAI,
    doc: DocumentInput,
    id_offset: int,
    attempt: int = 1
) -> List[Requirement]:
    """
    Run the extraction chain for a single document.
    Automatically retries once if the response is malformed JSON.
    """
    # Truncate oversized documents
    text = doc.text
    if len(text) > MAX_CHARS_PER_DOC:
        logger.warning(
            f"[EXTRACTOR] Document '{doc.name}' truncated from "
            f"{len(text):,} to {MAX_CHARS_PER_DOC:,} chars"
        )
        text = text[:MAX_CHARS_PER_DOC] + "\n\n[... document truncated for token budget ...]"

    logger.info(f"[EXTRACTOR] Building prompt for '{doc.name}' ({len(text):,} chars)")

    # Build the prompt using the PromptTemplate
    prompt_text = EXTRACTION_PROMPT_TEMPLATE.format(
        system_context=SYSTEM_CONTEXT,
        document_name=doc.name,
        document_text=text,
    )

    logger.info(f"[EXTRACTOR] Sending to Gemini Flash (attempt {attempt})...")
    t0 = time.time()

    try:
        response = llm.invoke([HumanMessage(content=prompt_text)])
        raw_output = response.content
        elapsed = time.time() - t0
        logger.info(
            f"[EXTRACTOR] LLM responded in {elapsed:.2f}s — "
            f"{len(raw_output)} chars of output"
        )
    except Exception as e:
        raise RuntimeError(f"Gemini API call failed for '{doc.name}': {e}")

    # Parse output
    try:
        requirements = _parse_requirements_json(raw_output, doc.name, id_offset)
        logger.info(f"[EXTRACTOR] Parsed {len(requirements)} requirements from '{doc.name}'")
        return requirements
    except ValueError as parse_err:
        if attempt < 2:
            logger.warning(
                f"[EXTRACTOR] JSON parse failed on attempt {attempt}, retrying once...\n{parse_err}"
            )
            return _extract_from_document(llm, doc, id_offset, attempt=2)
        else:
            raise RuntimeError(
                f"Failed to parse requirements from '{doc.name}' after 2 attempts: {parse_err}"
            )


def extract_requirements(documents: List[DocumentInput]) -> dict:
    """
    Main entry point: extract requirements from a list of parsed documents.

    Returns:
        {
            "requirements": [...],
            "stats": {
                "documents_processed": int,
                "total_requirements": int,
                "total_chars_processed": int,
                "elapsed_seconds": float,
                "per_document": [{"name": str, "count": int}]
            }
        }
    """
    logger.info(f"[EXTRACTOR] Starting extraction for {len(documents)} document(s)")
    t_start = time.time()

    llm = _get_llm()
    all_requirements: List[Requirement] = []
    per_doc_stats = []
    total_chars = 0

    for doc_index, doc in enumerate(documents):
        logger.info(
            f"[EXTRACTOR] Processing document {doc_index + 1}/{len(documents)}: '{doc.name}'"
        )
        total_chars += len(doc.text)
        id_offset = doc_index * REQ_ID_OFFSET_PER_DOC

        try:
            reqs = _extract_from_document(llm, doc, id_offset)
            all_requirements.extend(reqs)
            per_doc_stats.append({"name": doc.name, "count": len(reqs)})
            logger.info(
                f"[EXTRACTOR] '{doc.name}' → {len(reqs)} requirements extracted"
            )
        except RuntimeError as e:
            logger.error(f"[EXTRACTOR] Failed on '{doc.name}': {e}")
            per_doc_stats.append({"name": doc.name, "count": 0, "error": str(e)})
            raise  # Re-raise so the API route can return a proper error

    elapsed = time.time() - t_start
    logger.info(
        f"[EXTRACTOR] Completed — {len(all_requirements)} total requirements "
        f"from {len(documents)} docs in {elapsed:.2f}s"
    )

    return {
        "requirements": [r.model_dump() for r in all_requirements],
        "stats": {
            "documents_processed": len(documents),
            "total_requirements": len(all_requirements),
            "total_chars_processed": total_chars,
            "elapsed_seconds": round(elapsed, 2),
            "per_document": per_doc_stats,
        }
    }
