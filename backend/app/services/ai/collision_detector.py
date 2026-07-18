"""
collision_detector.py — Requirement Collision Detection Engine.

Takes structured requirements from the extraction pipeline and uses LLMs to
find logical conflicts between them.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from app.services.ai.collision_prompt import COLLISION_PROMPT_TEMPLATE, COLLISION_SYSTEM_CONTEXT
from app.services.ai.provider_manager import provider_manager

logger = logging.getLogger("speclens.collision")

MAX_REQS_PER_BATCH = 60
MAX_CHARS_PER_REQ = 400
MAX_PARSE_ATTEMPTS = 2
BATCH_ID_OFFSET_MULTIPLIER = 100
DEFAULT_CONFIDENCE = 0.75

HEALTH_SCORE_INITIAL = 100
HEALTH_SCORE_PENALTY_CRITICAL = 12
HEALTH_SCORE_PENALTY_HIGH = 8
HEALTH_SCORE_PENALTY_MEDIUM = 4
HEALTH_SCORE_PENALTY_LOW = 1

VALID_SEVERITIES = frozenset({"Critical", "High", "Medium", "Low"})


def _get_llm() -> Any:
    """Initialise the LLM via the compatibility layer."""
    from app.services.ai.llm import get_llm
    return get_llm(temperature=0.1)


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` wrappers the model may emit."""
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*```\s*$', '', text)
    return text.strip()


def _truncate_statement(statement: str) -> str:
    """Truncate long requirement statements for prompt token budgeting."""
    if len(statement) > MAX_CHARS_PER_REQ:
        return statement[:MAX_CHARS_PER_REQ] + "..."
    return statement


def _reqs_to_json_str(requirements: list[dict[str, Any]]) -> str:
    """Serialise requirements to a compact JSON string for the prompt."""
    slim = [
        {
            "id": r.get("id"),
            "document": r.get("document"),
            "category": r.get("category"),
            "priority": r.get("priority"),
            "statement": _truncate_statement(r.get("statement", "")),
        }
        for r in requirements
    ]
    return json.dumps(slim, indent=2)


_VALID_FINDING_TYPES = {
    "Contradiction",
    "Ambiguity",
    "Capacity Mismatch",
    "Potential Conflict",
    "Recommendation",
}

# Map legacy LLM type labels to the current classification set.
_LEGACY_TYPE_ALIASES = {
    "Authentication Conflict": "Contradiction",
    "Authorization Conflict": "Contradiction",
    "API Contract Conflict": "Contradiction",
    "Business Rule Conflict": "Potential Conflict",
    "Performance Conflict": "Ambiguity",
    "Compliance Conflict": "Contradiction",
    "Data Constraint Conflict": "Contradiction",
    "Workflow Conflict": "Potential Conflict",
    "Feature Logic Conflict": "Potential Conflict",
    "Security Policy Conflict": "Contradiction",
    "Technical Constraint Conflict": "Potential Conflict",
}


def _build_requirement_lookup(requirements: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Index requirements by ID for evidence enrichment."""
    return {requirement.get("id"): requirement for requirement in requirements if requirement.get("id")}


def _normalise_finding_type(raw_type: Any) -> str:
    """Map model output to a supported finding classification."""
    if not isinstance(raw_type, str):
        return "Potential Conflict"
    if raw_type in _VALID_FINDING_TYPES:
        return raw_type
    return _LEGACY_TYPE_ALIASES.get(raw_type, "Potential Conflict")


def _enrich_collision_evidence(
    collision: dict[str, Any],
    requirement_lookup: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Preserve source evidence: requirement IDs, documents, and original statements."""
    requirement_a = requirement_lookup.get(collision.get("requirement_a"), {})
    requirement_b = requirement_lookup.get(collision.get("requirement_b"), {})

    if requirement_a.get("statement"):
        collision["statement_a"] = requirement_a["statement"]
    if requirement_b.get("statement"):
        collision["statement_b"] = requirement_b["statement"]

    documents: list[str] = []
    for document_name in collision.get("documents") or []:
        if isinstance(document_name, str) and document_name:
            documents.append(document_name)
    for requirement in (requirement_a, requirement_b):
        document_name = requirement.get("document")
        if isinstance(document_name, str) and document_name and document_name not in documents:
            documents.append(document_name)
    collision["documents"] = documents

    return collision


def _parse_collision_json(
    raw: str,
    id_offset: int,
    requirement_lookup: dict[str, dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """
    Parse raw LLM output into a list of collision dicts.
    Raises ValueError if parsing fails after cleanup.
    """
    cleaned = _strip_markdown_fences(raw)
    lookup = requirement_lookup or {}

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        match = re.search(r'\{[\s\S]*"collisions"[\s\S]*\}', cleaned)
        if match:
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                raise ValueError(f"Could not parse collision JSON: {e}\nRaw: {cleaned[:400]}")
        else:
            raise ValueError(f"No valid collision JSON found: {e}\nRaw: {cleaned[:400]}")

    raw_collisions = data.get("collisions", [])
    collisions: list[dict[str, Any]] = []

    for index, collision in enumerate(raw_collisions):
        collision["id"] = f"COL-{id_offset + index + 1:03d}"

        if collision.get("severity") not in VALID_SEVERITIES:
            collision["severity"] = "Medium"

        collision["type"] = _normalise_finding_type(collision.get("type"))

        try:
            confidence = float(collision.get("confidence", DEFAULT_CONFIDENCE))
            if confidence > 1.0:
                confidence = confidence / 100.0
            collision["confidence"] = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            collision["confidence"] = DEFAULT_CONFIDENCE

        if not isinstance(collision.get("documents"), list):
            collision["documents"] = []

        for field in (
            "requirement_a",
            "requirement_b",
            "statement_a",
            "statement_b",
            "reason",
            "recommendation",
        ):
            if not isinstance(collision.get(field), str):
                collision[field] = ""

        collision = _enrich_collision_evidence(collision, lookup)
        collisions.append(collision)

    return collisions


def _run_collision_batch(
    llm: Any,
    requirements: list[dict[str, Any]],
    id_offset: int,
    attempt: int = 1,
) -> list[dict[str, Any]]:
    """
    Send one batch of requirements to the ProviderManager and return detected collisions.
    Automatically retries once on malformed JSON.
    """
    logger.info("[COLLISION] Starting batch")
    reqs_json = _reqs_to_json_str(requirements)
    logger.info(
        f"[COLLISION] Building prompt for {len(requirements)} requirements "
        f"({len(reqs_json)} chars), attempt {attempt}"
    )

    prompt_text = COLLISION_PROMPT_TEMPLATE.format(
        system_context=COLLISION_SYSTEM_CONTEXT,
        requirements_json=reqs_json,
    )

    t0 = time.time()
    try:
        logger.info("[STAGE] AI invocation started (Collision Detection)")
        raw_output = provider_manager.generate(prompt_text, temperature=0.1)
        logger.info("[STAGE] AI invocation completed (Collision Detection)")
    except Exception as e:
        # Re-raise standard/custom provider failures
        raise e

    elapsed = time.time() - t0
    logger.info(f"[COLLISION] LLM responded in {elapsed:.2f}s — {len(raw_output)} chars")

    try:
        logger.info("[STAGE] Response parsing started (Collision Detection)")
        requirement_lookup = _build_requirement_lookup(requirements)
        collisions = _parse_collision_json(raw_output, id_offset, requirement_lookup)
        logger.info(f"[STAGE] Response parsing completed (Collision Detection): parsed {len(collisions)} collisions")
        logger.info(f"[COLLISION] Parsed {len(collisions)} collision(s) from batch")
        return collisions
    except ValueError as parse_err:
        logger.exception("[COLLISION] JSON parse failed on attempt %d", attempt)
        if attempt < MAX_PARSE_ATTEMPTS:
            logger.warning("[COLLISION] JSON parse failed (attempt %d), retrying...\n%s", attempt, parse_err)
            return _run_collision_batch(llm, requirements, id_offset, attempt=2)
        raise RuntimeError(f"Failed to parse collision output after 2 attempts: {parse_err}") from parse_err


def _compute_health_score(collisions: list[dict[str, Any]]) -> int:
    """
    Dynamic health score starting at 100.
    Critical: -12, High: -8, Medium: -4, Low: -1. Minimum 0.
    """
    score = HEALTH_SCORE_INITIAL
    for collision in collisions:
        severity = collision.get("severity", "Low")
        if severity == "Critical":
            score -= HEALTH_SCORE_PENALTY_CRITICAL
        elif severity == "High":
            score -= HEALTH_SCORE_PENALTY_HIGH
        elif severity == "Medium":
            score -= HEALTH_SCORE_PENALTY_MEDIUM
        else:
            score -= HEALTH_SCORE_PENALTY_LOW
    return max(0, score)


def detect_collisions(requirements: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Main entry point: detect requirement collisions across the full requirements list.

    Args:
        requirements: list of requirement dicts from the extraction engine
                      (each has: id, document, category, statement, priority, confidence)

    Returns:
        {
            "collisions": [...],
            "stats": {
                "requirements_compared": int,
                "pair_count": int,
                "llm_calls": int,
                "collisions_found": int,
                "health_score": int,
                "critical_count": int,
                "high_count": int,
                "medium_count": int,
                "low_count": int,
                "elapsed_seconds": float,
            }
        }
    """
    t_start = time.time()
    req_count = len(requirements)
    pair_count = req_count * (req_count - 1) // 2  # C(n,2)

    logger.info(
        f"[COLLISION] Starting collision detection: "
        f"{req_count} requirements, {pair_count} possible pairs"
    )

    llm = _get_llm()
    all_collisions: list[dict[str, Any]] = []
    llm_calls = 0

    batches = [
        requirements[index : index + MAX_REQS_PER_BATCH]
        for index in range(0, req_count, MAX_REQS_PER_BATCH)
    ]

    logger.info(
        f"[COLLISION] Processing {len(batches)} batch(es) "
        f"of up to {MAX_REQS_PER_BATCH} requirements each"
    )

    for batch_idx, batch in enumerate(batches):
        id_offset = batch_idx * BATCH_ID_OFFSET_MULTIPLIER
        logger.info(
            f"[COLLISION] Batch {batch_idx + 1}/{len(batches)}: "
            f"{len(batch)} requirements"
        )
        try:
            batch_collisions = _run_collision_batch(llm, batch, id_offset)
            all_collisions.extend(batch_collisions)
            llm_calls += 1
        except Exception as e:
            logger.error(f"[COLLISION] Batch {batch_idx + 1} failed: {e}")
            raise

    # Re-number all collision IDs sequentially across batches
    for i, col in enumerate(all_collisions):
        col["id"] = f"COL-{i + 1:03d}"

    elapsed = time.time() - t_start
    health_score = _compute_health_score(all_collisions)

    # Tally by severity
    critical = sum(1 for c in all_collisions if c.get("severity") == "Critical")
    high     = sum(1 for c in all_collisions if c.get("severity") == "High")
    medium   = sum(1 for c in all_collisions if c.get("severity") == "Medium")
    low      = sum(1 for c in all_collisions if c.get("severity") == "Low")

    logger.info(
        f"[COLLISION] Complete — {len(all_collisions)} collision(s) found in {elapsed:.2f}s "
        f"(Critical: {critical}, High: {high}, Medium: {medium}, Low: {low}) "
        f"Health Score: {health_score}/100"
    )

    return {
        "collisions": all_collisions,
        "stats": {
            "requirements_compared": req_count,
            "pair_count": pair_count,
            "llm_calls": llm_calls,
            "collisions_found": len(all_collisions),
            "health_score": health_score,
            "critical_count": critical,
            "high_count": high,
            "medium_count": medium,
            "low_count": low,
            "elapsed_seconds": round(elapsed, 2),
        }
    }
