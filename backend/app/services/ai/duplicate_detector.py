"""Duplicate requirement detection engine for cross-document redundancy analysis."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from app.services.ai.duplicate_prompt import DUPLICATE_PROMPT_TEMPLATE, DUPLICATE_SYSTEM_CONTEXT
from app.services.ai.provider_manager import provider_manager

logger = logging.getLogger("speclens.duplicate")

MAX_REQS_PER_BATCH = 60
MAX_CHARS_PER_REQ = 400
MAX_PARSE_ATTEMPTS = 2
DUPLICATE_ID_OFFSET_PER_BATCH = 100
DEFAULT_CONFIDENCE = 0.75

_VALID_DUPLICATE_TYPES = {
    "Exact Duplicate",
    "Near Duplicate",
    "Partial Duplicate",
}

_TYPE_ALIASES = {
    "exact duplicate": "Exact Duplicate",
    "near duplicate": "Near Duplicate",
    "partial duplicate": "Partial Duplicate",
    "Exact": "Exact Duplicate",
    "Near": "Near Duplicate",
    "Partial": "Partial Duplicate",
}


def _strip_markdown_fences(text: str) -> str:
    """Remove optional Markdown code fences from an LLM JSON response.

    Args:
        text: Raw model output that may be wrapped in ``` fences.

    Returns:
        Fence-stripped text ready for JSON parsing.
    """
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*```\s*$', '', text)
    return text.strip()


def _truncate_statement(statement: str) -> str:
    """Truncate long requirement statements for prompt size limits."""
    if len(statement) > MAX_CHARS_PER_REQ:
        return statement[:MAX_CHARS_PER_REQ] + "..."
    return statement


def _reqs_to_json_str(requirements: list[dict[str, Any]]) -> str:
    """Serialize a slim requirement payload for duplicate-detection prompts."""
    slim = [
        {
            "id": requirement.get("id"),
            "document": requirement.get("document"),
            "category": requirement.get("category"),
            "priority": requirement.get("priority"),
            "statement": _truncate_statement(requirement.get("statement", "")),
        }
        for requirement in requirements
    ]
    return json.dumps(slim, indent=2)


def _build_requirement_lookup(requirements: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Index requirements by ID for evidence enrichment."""
    return {requirement.get("id"): requirement for requirement in requirements if requirement.get("id")}


def _normalise_duplicate_type(raw_type: Any) -> str:
    """Map provider-specific duplicate labels to supported canonical types."""
    if not isinstance(raw_type, str):
        return "Near Duplicate"
    if raw_type in _VALID_DUPLICATE_TYPES:
        return raw_type
    return _TYPE_ALIASES.get(raw_type.strip().lower(), "Near Duplicate")


def _enrich_duplicate_evidence(
    duplicate: dict[str, Any],
    requirement_lookup: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Attach source statements and document names to a duplicate finding."""
    req_a = requirement_lookup.get(duplicate.get("requirement_a"), {})
    req_b = requirement_lookup.get(duplicate.get("requirement_b"), {})

    if req_a.get("statement"):
        duplicate["statement_a"] = req_a["statement"]
    if req_b.get("statement"):
        duplicate["statement_b"] = req_b["statement"]

    if req_a.get("document"):
        duplicate["document_a"] = req_a["document"]
    if req_b.get("document"):
        duplicate["document_b"] = req_b["document"]

    for field in ("document_a", "document_b"):
        if not isinstance(duplicate.get(field), str):
            duplicate[field] = ""

    return duplicate


def _is_valid_cross_document_pair(
    duplicate: dict[str, Any],
    requirement_lookup: dict[str, dict[str, Any]],
) -> bool:
    """Return True when a duplicate pair references distinct cross-document requirements."""
    req_a_id = duplicate.get("requirement_a")
    req_b_id = duplicate.get("requirement_b")
    if not req_a_id or not req_b_id or req_a_id == req_b_id:
        return False

    req_a = requirement_lookup.get(req_a_id, {})
    req_b = requirement_lookup.get(req_b_id, {})
    doc_a = duplicate.get("document_a") or req_a.get("document")
    doc_b = duplicate.get("document_b") or req_b.get("document")
    if not doc_a or not doc_b or doc_a == doc_b:
        return False
    return True


def _parse_duplicate_json(
    raw: str,
    id_offset: int,
    requirement_lookup: dict[str, dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Parse and validate duplicate findings from model JSON output.

    Args:
        raw: Raw LLM response text.
        id_offset: Starting offset for generated duplicate IDs.
        requirement_lookup: Requirements indexed by ID for enrichment.

    Returns:
        Parsed duplicate findings that pass cross-document validation.

    Raises:
        ValueError: When the response cannot be parsed as JSON.
    """
    cleaned = _strip_markdown_fences(raw)
    lookup = requirement_lookup or {}

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        match = re.search(r'\{[\s\S]*"duplicates"[\s\S]*\}', cleaned)
        if match:
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                raise ValueError(f"Could not parse duplicate JSON: {exc}\nRaw: {cleaned[:400]}") from exc
        else:
            raise ValueError(f"No valid duplicate JSON found: {exc}\nRaw: {cleaned[:400]}") from exc

    raw_duplicates = data.get("duplicates", [])
    duplicates: list[dict[str, Any]] = []

    for index, duplicate in enumerate(raw_duplicates):
        duplicate["id"] = f"DUP-{id_offset + index + 1:03d}"
        duplicate["type"] = _normalise_duplicate_type(duplicate.get("type"))

        try:
            confidence = float(duplicate.get("confidence", DEFAULT_CONFIDENCE))
            if confidence > 1.0:
                confidence = confidence / 100.0
            duplicate["confidence"] = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            duplicate["confidence"] = DEFAULT_CONFIDENCE

        for field in (
            "requirement_a", "requirement_b", "document_a", "document_b",
            "statement_a", "statement_b", "reason", "suggested_action",
        ):
            if not isinstance(duplicate.get(field), str):
                duplicate[field] = ""

        duplicate = _enrich_duplicate_evidence(duplicate, lookup)
        if _is_valid_cross_document_pair(duplicate, lookup):
            duplicates.append(duplicate)

    return duplicates


def _run_duplicate_batch(
    requirements: list[dict[str, Any]],
    id_offset: int,
    attempt: int = 1,
) -> list[dict[str, Any]]:
    """Run duplicate detection for a single requirement batch.

    Args:
        requirements: Requirement batch to compare.
        id_offset: Starting offset for generated duplicate IDs.
        attempt: Current parse-retry attempt number.

    Returns:
        Parsed duplicate findings for the batch.

    Raises:
        RuntimeError: When parsing fails after the maximum retry count.
    """
    logger.info("[DUPLICATE] Starting batch")
    requirement_lookup = _build_requirement_lookup(requirements)
    reqs_json = _reqs_to_json_str(requirements)
    logger.info(
        "[DUPLICATE] Building prompt for %d requirements (%d chars), attempt %d",
        len(requirements),
        len(reqs_json),
        attempt,
    )

    prompt_text = DUPLICATE_PROMPT_TEMPLATE.format(
        system_context=DUPLICATE_SYSTEM_CONTEXT,
        requirements_json=reqs_json,
    )

    batch_start = time.time()
    logger.info("[STAGE] AI invocation started (Duplicate Detection)")
    raw_output = provider_manager.generate(prompt_text, temperature=0.1)
    logger.info("[STAGE] AI invocation completed (Duplicate Detection)")

    elapsed = time.time() - batch_start
    logger.info("[DUPLICATE] LLM responded in %.2fs — %d chars", elapsed, len(raw_output))

    try:
        logger.info("[STAGE] Response parsing started (Duplicate Detection)")
        duplicates = _parse_duplicate_json(raw_output, id_offset, requirement_lookup)
        logger.info(
            "[STAGE] Response parsing completed (Duplicate Detection): parsed %d duplicates",
            len(duplicates),
        )
        return duplicates
    except ValueError as parse_err:
        if attempt < MAX_PARSE_ATTEMPTS:
            logger.warning("[DUPLICATE] JSON parse failed (attempt %d), retrying: %s", attempt, parse_err)
            return _run_duplicate_batch(requirements, id_offset, attempt=attempt + 1)
        raise RuntimeError(f"Failed to parse duplicate output after {MAX_PARSE_ATTEMPTS} attempts: {parse_err}") from parse_err


def detect_duplicates(requirements: list[dict[str, Any]]) -> dict[str, Any]:
    """Detect duplicate or near-duplicate requirements across documents.

    Args:
        requirements: Structured requirements from the extraction engine.

    Returns:
        Duplicate findings and analysis statistics.
    """
    t_start = time.time()
    req_count = len(requirements)

    documents = {r.get("document") for r in requirements if r.get("document")}
    cross_doc_pair_count = 0
    if len(documents) > 1:
        by_doc: dict[str, list[str]] = {}
        for requirement in requirements:
            doc = requirement.get("document")
            if doc:
                by_doc.setdefault(doc, []).append(requirement.get("id"))
        doc_ids = list(by_doc.values())
        for i in range(len(doc_ids)):
            for j in range(i + 1, len(doc_ids)):
                cross_doc_pair_count += len(doc_ids[i]) * len(doc_ids[j])

    logger.info(
        "[DUPLICATE] Starting duplicate detection: %d requirements, %d cross-document pairs",
        req_count,
        cross_doc_pair_count,
    )

    all_duplicates: list[dict[str, Any]] = []
    llm_calls = 0

    if req_count < 2 or len(documents) < 2:
        elapsed = time.time() - t_start
        logger.info("[DUPLICATE] Skipped — fewer than 2 documents with requirements")
        return {
            "duplicates": [],
            "stats": {
                "requirements_compared": req_count,
                "cross_document_pair_count": cross_doc_pair_count,
                "llm_calls": 0,
                "duplicates_found": 0,
                "exact_count": 0,
                "near_count": 0,
                "partial_count": 0,
                "elapsed_seconds": round(elapsed, 2),
            },
        }

    batches = [
        requirements[index:index + MAX_REQS_PER_BATCH]
        for index in range(0, req_count, MAX_REQS_PER_BATCH)
    ]

    for batch_idx, batch in enumerate(batches):
        id_offset = batch_idx * DUPLICATE_ID_OFFSET_PER_BATCH
        logger.info("[DUPLICATE] Batch %d/%d: %d requirements", batch_idx + 1, len(batches), len(batch))
        batch_duplicates = _run_duplicate_batch(batch, id_offset)
        all_duplicates.extend(batch_duplicates)
        llm_calls += 1

    for index, duplicate in enumerate(all_duplicates):
        duplicate["id"] = f"DUP-{index + 1:03d}"

    elapsed = time.time() - t_start
    exact = sum(1 for duplicate in all_duplicates if duplicate.get("type") == "Exact Duplicate")
    near = sum(1 for duplicate in all_duplicates if duplicate.get("type") == "Near Duplicate")
    partial = sum(1 for duplicate in all_duplicates if duplicate.get("type") == "Partial Duplicate")

    logger.info(
        "[DUPLICATE] Complete — %d duplicate(s) found in %.2fs (Exact: %d, Near: %d, Partial: %d)",
        len(all_duplicates),
        elapsed,
        exact,
        near,
        partial,
    )

    return {
        "duplicates": all_duplicates,
        "stats": {
            "requirements_compared": req_count,
            "cross_document_pair_count": cross_doc_pair_count,
            "llm_calls": llm_calls,
            "duplicates_found": len(all_duplicates),
            "exact_count": exact,
            "near_count": near,
            "partial_count": partial,
            "elapsed_seconds": round(elapsed, 2),
        },
    }
