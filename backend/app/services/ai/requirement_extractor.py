"""
requirement_extractor.py — Core AI extraction engine.

Uses LangChain and configured LLM providers to convert raw document text into
structured Requirement objects. Includes automatic retry on malformed JSON.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from langchain_core.output_parsers import JsonOutputParser

from app.services.ai.prompts import EXTRACTION_PROMPT_TEMPLATE, SYSTEM_CONTEXT
from app.services.ai.provider_manager import AllProvidersUnavailableError, provider_manager
from app.services.ai.schemas import DocumentInput, Requirement

logger = logging.getLogger("speclens.extractor")

# ---------------------------------------------------------------------------
# Token budgeting — Gemini Flash has a generous context window but we still
# truncate very large documents to avoid hitting limits and keep latency low.
# ---------------------------------------------------------------------------
MAX_CHARS_PER_DOC = 40_000   # ~10k tokens per doc (rough 4 chars/token)
REQ_ID_OFFSET_PER_DOC = 100  # Keeps REQ IDs globally unique across docs


def _get_llm() -> Any:
    """Initialise the LLM via the compatibility layer."""
    from app.services.ai.llm import get_llm
    return get_llm(temperature=0.1)


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers the model may emit."""
    text = text.strip()
    # Remove ```json or ``` at start
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    # Remove ``` at end
    text = re.sub(r'\s*```\s*$', '', text)
    return text.strip()


def _parse_plain_text_fallback(text: str) -> list[dict[str, Any]]:
    """Build requirement dictionaries from unstructured text when JSON parsing fails.

    Args:
        text: Raw model output or plain document text.

    Returns:
        Heuristically parsed requirement dictionaries suitable for normalisation.
    """
    logger.info("[EXTRACTOR] JSON parsing failed. Running line/regex fallback parser.")
    raw_reqs = []
    
    # Split text into lines/sentences
    candidates = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if len(line) > 120 and "." in line:
            sentences = re.split(r'\.\s+', line)
            for s in sentences:
                s = s.strip()
                if len(s) > 5:
                    if not s.endswith('.'):
                        s += '.'
                    candidates.append(s)
        else:
            candidates.append(line)
            
    for idx, candidate in enumerate(candidates):
        # Clean list indicators like "1.", "- ", "* ", "REQ-001:", etc.
        cleaned = re.sub(r'^(?:\d+[\.\)]|[-*•+]|REQ-\d+:?)\s*', '', candidate).strip()
        if len(cleaned) < 5:
            continue
            
        # Classify priority
        priority = "Medium"
        lower_s = cleaned.lower()
        if any(w in lower_s for w in ["must", "shall", "critical", "mandatory", "required"]):
            priority = "Critical"
        elif any(w in lower_s for w in ["should", "high"]):
            priority = "High"
        elif any(w in lower_s for w in ["may", "can", "could", "low", "optional"]):
            priority = "Low"
            
        # Classify category
        category = "Functional"
        if any(w in lower_s for w in ["security", "auth", "login", "encrypt", "token"]):
            category = "Security"
        elif any(w in lower_s for w in ["performance", "latency", "throughput", "speed", "sla"]):
            category = "Performance"
        elif any(w in lower_s for w in ["comply", "compliance", "gdpr", "hipaa", "legal"]):
            category = "Compliance"
        elif any(w in lower_s for w in ["api", "endpoint", "rest", "payload"]):
            category = "API"
        elif any(w in lower_s for w in ["database", "schema", "table", "constraint"]):
            category = "Data Constraint"
        elif any(w in lower_s for w in ["framework", "platform", "version", "python", "fastapi"]):
            category = "Technical Constraint"
        elif any(w in lower_s for w in ["non-functional", "nfr"]):
            category = "Non-Functional"

        raw_reqs.append({
            "id": f"REQ-{idx+1:03d}",
            "category": category,
            "statement": cleaned,
            "priority": priority,
            "confidence": 0.75
        })
        
    return raw_reqs


def _parse_requirements_json(
    raw: str,
    document_name: str,
    id_offset: int,
    attempt: int = 1,
) -> tuple[list[Requirement], str]:
    """Parse LLM JSON output into validated ``Requirement`` objects.

    Args:
        raw: Raw model response text.
        document_name: Source document filename for metadata.
        id_offset: Numeric offset used to keep requirement IDs globally unique.
        attempt: Current parse attempt number (1 or 2).

    Returns:
        Parsed requirements and a short status string describing the parse path.

    Raises:
        ValueError: When parsing fails on the first attempt.
    """
    logger.debug("Raw LLM response before parsing for '%s': %s", document_name, raw)

    cleaned = raw.strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*```\s*$', '', cleaned)
    cleaned = cleaned.strip()

    json_status = "Success"
    try:
        # 4. Use LangChain's JsonOutputParser instead of manually calling json.loads() whenever possible
        parser = JsonOutputParser()
        data = parser.parse(cleaned)
    except Exception as parse_err:
        logger.warning("JsonOutputParser failed: %s. Falling back to manual parsing...", parse_err)
        try:
            data = json.loads(cleaned)
            json_status = "Success (Manual loads)"
        except json.JSONDecodeError as e:
            # Attempt to find JSON object or array within surrounding text
            match_obj = re.search(r'\{[\s\S]*\}', cleaned)
            match_arr = re.search(r'\[[\s\S]*\]', cleaned)
            
            # Prefer larger/valid match
            parsed = False
            if match_arr:
                try:
                    data = json.loads(match_arr.group(0))
                    parsed = True
                    json_status = "Success (Regex Array match)"
                except json.JSONDecodeError:
                    pass
            
            if not parsed and match_obj:
                try:
                    data = json.loads(match_obj.group(0))
                    parsed = True
                    json_status = "Success (Regex Object match)"
                except json.JSONDecodeError:
                    pass
                    
            if not parsed:
                if attempt == 1:
                    raise ValueError(f"No valid JSON found in LLM output on attempt 1: {e}")
                else:
                    # 6. If JSON parsing fails on attempt 2, use regex / line parser, build the JSON manually
                    data = _parse_plain_text_fallback(cleaned)
                    json_status = "Failed - Fallback line parser used"

    # Handle if data is a list (JSON array) or a dict (JSON object)
    if isinstance(data, list):
        raw_reqs = data
    elif isinstance(data, dict):
        raw_reqs = data.get("requirements", [])
    else:
        raw_reqs = []
        
    requirements: list[Requirement] = []

    for i, req in enumerate(raw_reqs):
        if not isinstance(req, dict):
            continue
            
        # Get requirement statement
        statement = req.get("statement") or req.get("description") or req.get("text")
        if not statement:
            # Try to grab first string value representing the statement
            candidates = [v for v in req.values() if isinstance(v, str) and len(v) > 8]
            if candidates:
                statement = candidates[0]
            else:
                continue
        req["statement"] = statement

        # Ensure globally unique IDs by incorporating document offset
        req_id = f"REQ-{id_offset + len(requirements) + 1:03d}"
        req["id"] = req_id
        req["document"] = document_name
        
        # Clamp confidence
        try:
            req["confidence"] = max(0.0, min(1.0, float(req.get("confidence", 0.75))))
        except (TypeError, ValueError):
            req["confidence"] = 0.75
            
        # Normalise category mapping to Pydantic Literal values
        category = req.get("category", "")
        if isinstance(category, str):
            category_clean = category.strip().title()
            category_map = {
                "Functional Requirements": "Functional",
                "Functional Requirement": "Functional",
                "Non-Functional Requirements": "Non-Functional",
                "Non-Functional Requirement": "Non-Functional",
                "Business Rules": "Business Rule",
                "Business Rule": "Business Rule",
                "Security Requirements": "Security",
                "Security Requirement": "Security",
                "Performance Requirements": "Performance",
                "Performance Requirement": "Performance",
                "Compliance Requirements": "Compliance",
                "Compliance Requirement": "Compliance",
                "Api Requirements": "API",
                "Api Requirement": "API",
                "Api": "API",
                "User Stories": "User Story",
                "User Story": "User Story",
                "Acceptance Criterias": "Acceptance Criteria",
                "Acceptance Criteria": "Acceptance Criteria",
                "Data Constraints": "Data Constraint",
                "Data Constraint": "Data Constraint",
                "Technical Constraints": "Technical Constraint",
                "Technical Constraint": "Technical Constraint"
            }
            if category_clean in category_map:
                req["category"] = category_map[category_clean]
            else:
                lower_cat = category_clean.lower()
                if "non-functional" in lower_cat:
                    req["category"] = "Non-Functional"
                elif "functional" in lower_cat:
                    req["category"] = "Functional"
                elif "business" in lower_cat:
                    req["category"] = "Business Rule"
                elif "security" in lower_cat:
                    req["category"] = "Security"
                elif "performance" in lower_cat:
                    req["category"] = "Performance"
                elif "compliance" in lower_cat:
                    req["category"] = "Compliance"
                elif "api" in lower_cat:
                    req["category"] = "API"
                elif "user story" in lower_cat or "user stories" in lower_cat:
                    req["category"] = "User Story"
                elif "acceptance" in lower_cat:
                    req["category"] = "Acceptance Criteria"
                elif "data" in lower_cat:
                    req["category"] = "Data Constraint"
                elif "technical" in lower_cat:
                    req["category"] = "Technical Constraint"
                else:
                    req["category"] = "Functional"
        else:
            req["category"] = "Functional"

        # Normalise priority
        priority = req.get("priority", "")
        if isinstance(priority, str):
            priority_clean = priority.strip().title()
            if priority_clean in ["Critical", "High", "Medium", "Low"]:
                req["priority"] = priority_clean
            else:
                req["priority"] = "Medium"
        else:
            req["priority"] = "Medium"

        # Validate and append
        try:
            requirements.append(Requirement(**req))
        except Exception as e:
            logger.warning(f"Skipping malformed requirement at index {i}: {e} — {req}")

    return requirements, json_status


def _extract_from_document(
    llm: Any,
    doc: DocumentInput,
    id_offset: int,
    attempt: int = 1,
    previous_response: str | None = None,
) -> list[Requirement]:
    """Run the extraction chain for a single document with one JSON retry.

    Args:
        llm: Compatibility LLM wrapper (retained for interface parity).
        doc: Parsed document input containing filename and text.
        id_offset: Numeric offset used to keep requirement IDs globally unique.
        attempt: Current extraction attempt number (1 or 2).
        previous_response: Prior invalid model output included on retry prompts.

    Returns:
        Structured requirements extracted from the document.

    Raises:
        AllProvidersUnavailableError: When every configured provider is unavailable.
        RuntimeError: When provider calls or parsing fail after retries.
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

    if attempt == 1:
        prompt = prompt_text
    else:
        prompt = (
            f"{prompt_text}\n\n"
            f"[Previous invalid JSON response]:\n{previous_response}\n\n"
            f"Error: Your previous response was invalid JSON. Return ONLY valid JSON."
        )

    logger.info(f"[EXTRACTOR] Sending to AI Provider (attempt {attempt})...")
    t0 = time.time()

    try:
        logger.info(f"[STAGE] AI invocation started (Requirement Extraction) for '{doc.name}'")
        raw_output = provider_manager.generate(prompt, temperature=0.1)
        logger.info(f"[STAGE] AI invocation completed (Requirement Extraction) for '{doc.name}'")
        elapsed = time.time() - t0
        logger.info(
            f"[EXTRACTOR] LLM responded in {elapsed:.2f}s — "
            f"{len(raw_output)} chars of output"
        )
    except AllProvidersUnavailableError:
        raise
    except Exception as exc:
        logger.exception("AI provider call failed for '%s'", doc.name)
        raise RuntimeError(f"AI Provider call failed for '{doc.name}': {exc}") from exc

    try:
        logger.info("[STAGE] Response parsing started (Requirement Extraction) for '%s'", doc.name)
        requirements, json_status = _parse_requirements_json(raw_output, doc.name, id_offset, attempt)
        logger.info(
            "[STAGE] Response parsing completed (Requirement Extraction) for '%s': parsed %d requirements",
            doc.name,
            len(requirements),
        )
        logger.info(
            "Extraction summary for '%s': chars=%d type=%s requirements=%d response_len=%d elapsed=%.2fs json=%s",
            doc.name,
            len(text),
            doc.name.split(".")[-1].upper(),
            len(requirements),
            len(raw_output),
            elapsed,
            json_status,
        )
        return requirements
    except ValueError as parse_err:
        logger.exception("Parse exception for '%s'", doc.name)
        if attempt < 2:
            logger.warning(
                f"[EXTRACTOR] JSON parse failed on attempt {attempt}, retrying once...\n{parse_err}"
            )
            return _extract_from_document(llm, doc, id_offset, attempt=2, previous_response=raw_output)
        else:
            raise RuntimeError(
                f"Failed to parse requirements from '{doc.name}' after 2 attempts: {parse_err}"
            )


def extract_requirements(documents: list[DocumentInput]) -> dict[str, Any]:
    """Extract structured requirements from a list of parsed documents.

    Args:
        documents: Parsed document payloads from the extraction API route.

    Returns:
        Serialised requirements and per-document extraction statistics.

    Raises:
        AllProvidersUnavailableError: When every configured provider is unavailable.
        RuntimeError: When no requirements could be extracted from any document.
    """
    logger.info("[EXTRACTOR] Starting extraction for %d document(s)", len(documents))
    t_start = time.time()

    llm = _get_llm()
    all_requirements: list[Requirement] = []
    per_doc_stats: list[dict[str, Any]] = []
    total_chars = 0
    docs_failed = 0

    for doc_index, doc in enumerate(documents):
        char_count = len(doc.text)
        total_chars += char_count
        id_offset = doc_index * REQ_ID_OFFSET_PER_DOC

        try:
            reqs = _extract_from_document(llm, doc, id_offset)
            all_requirements.extend(reqs)
            per_doc_stats.append({"name": doc.name, "count": len(reqs)})
        except AllProvidersUnavailableError:
            raise
        except Exception as exc:
            logger.error("[EXTRACTOR] Failed on '%s': %s", doc.name, exc)
            per_doc_stats.append({"name": doc.name, "count": 0, "error": str(exc)})
            docs_failed += 1
            logger.info(
                "Extraction failed for '%s': chars=%d type=%s error=%s",
                doc.name,
                char_count,
                doc.name.split(".")[-1].upper(),
                exc,
            )

    elapsed = time.time() - t_start
    logger.info(
        "[EXTRACTOR] Completed — %d total requirements from %d docs in %.2fs",
        len(all_requirements),
        len(documents),
        elapsed,
    )
    logger.info(
        "Extraction run summary: documents=%d failed=%d requirements=%d elapsed=%.2fs",
        len(documents),
        docs_failed,
        len(all_requirements),
        elapsed,
    )

    if not all_requirements:
        raise RuntimeError("No requirements could be extracted from any of the provided documents.")

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
