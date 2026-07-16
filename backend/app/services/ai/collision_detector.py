"""
collision_detector.py — Requirement Collision Detection Engine.

Takes the structured requirements produced by Phase 4 (requirement_extractor.py)
and uses Gemini Flash + LangChain to find logical conflicts between them.
"""
import os
import json
import time
import logging
import re
from typing import List, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from app.services.ai.collision_prompt import COLLISION_PROMPT_TEMPLATE, COLLISION_SYSTEM_CONTEXT

logger = logging.getLogger("speclens.collision")

# ---------------------------------------------------------------------------
# Batching strategy
# When there are many requirements, we batch them to stay within token limits.
# Gemini Flash has a 1M context window, but we keep batches manageable.
# ---------------------------------------------------------------------------
MAX_REQS_PER_BATCH = 60   # Max requirements per LLM call
MAX_CHARS_PER_REQ = 400   # Truncate very long statements to keep token count sane


def _get_llm() -> ChatGoogleGenerativeAI:
    """Initialise the Gemini Flash LLM via LangChain."""
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key or api_key == "your_google_api_key_here":
        raise ValueError(
            "GOOGLE_API_KEY is not set. "
            "Add it to backend/.env as GOOGLE_API_KEY=your_key_here"
        )
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=api_key,
        temperature=0.1,
        max_output_tokens=8192,
    )


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` wrappers the model may emit."""
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*```\s*$', '', text)
    return text.strip()


def _truncate_statement(stmt: str) -> str:
    if len(stmt) > MAX_CHARS_PER_REQ:
        return stmt[:MAX_CHARS_PER_REQ] + "..."
    return stmt


def _reqs_to_json_str(requirements: List[Dict[str, Any]]) -> str:
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


def _parse_collision_json(raw: str, id_offset: int) -> List[Dict[str, Any]]:
    """
    Parse raw LLM output into a list of collision dicts.
    Raises ValueError if parsing fails after cleanup.
    """
    cleaned = _strip_markdown_fences(raw)

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
    collisions = []
    valid_severities = {"Critical", "High", "Medium", "Low"}
    valid_types = {
        "Authentication Conflict", "Authorization Conflict", "API Contract Conflict",
        "Business Rule Conflict", "Performance Conflict", "Compliance Conflict",
        "Data Constraint Conflict", "Workflow Conflict", "Feature Logic Conflict",
        "Security Policy Conflict", "Technical Constraint Conflict",
    }

    for i, col in enumerate(raw_collisions):
        # Re-assign IDs to be globally unique across batches
        col["id"] = f"COL-{id_offset + i + 1:03d}"

        # Validate + normalise severity
        if col.get("severity") not in valid_severities:
            col["severity"] = "Medium"

        # Validate + normalise type
        if col.get("type") not in valid_types:
            col["type"] = "Feature Logic Conflict"

        # Clamp confidence
        try:
            col["confidence"] = max(0.0, min(1.0, float(col.get("confidence", 0.75))))
        except (TypeError, ValueError):
            col["confidence"] = 0.75

        # Ensure documents is a list
        if not isinstance(col.get("documents"), list):
            col["documents"] = []

        # Ensure string fields
        for field in ("requirement_a", "requirement_b", "statement_a", "statement_b",
                      "reason", "recommendation"):
            if not isinstance(col.get(field), str):
                col[field] = ""

        collisions.append(col)

    return collisions


def _run_collision_batch(
    llm: ChatGoogleGenerativeAI,
    requirements: List[Dict[str, Any]],
    id_offset: int,
    attempt: int = 1,
) -> List[Dict[str, Any]]:
    """
    Send one batch of requirements to Gemini and return detected collisions.
    Automatically retries once on malformed JSON.
    """
    reqs_json = _reqs_to_json_str(requirements)
    logger.info(
        f"[COLLISION] Building prompt for {len(requirements)} requirements "
        f"({len(reqs_json)} chars), attempt {attempt}"
    )

    prompt_text = COLLISION_PROMPT_TEMPLATE.format(
        system_context=COLLISION_SYSTEM_CONTEXT,
        requirements_json=reqs_json,
    )

    logger.info(f"[COLLISION] Calling Gemini Flash (attempt {attempt})...")
    t0 = time.time()

    try:
        response = llm.invoke([HumanMessage(content=prompt_text)])
        raw_output = response.content
        elapsed = time.time() - t0
        logger.info(f"[COLLISION] LLM responded in {elapsed:.2f}s — {len(raw_output)} chars")
    except Exception as e:
        raise RuntimeError(f"Gemini API call failed in collision detector: {e}")

    try:
        collisions = _parse_collision_json(raw_output, id_offset)
        logger.info(f"[COLLISION] Parsed {len(collisions)} collision(s) from batch")
        return collisions
    except ValueError as parse_err:
        if attempt < 2:
            logger.warning(f"[COLLISION] JSON parse failed (attempt {attempt}), retrying...\n{parse_err}")
            return _run_collision_batch(llm, requirements, id_offset, attempt=2)
        else:
            raise RuntimeError(f"Failed to parse collision output after 2 attempts: {parse_err}")


def _compute_health_score(collisions: List[Dict[str, Any]]) -> int:
    """
    Dynamic health score starting at 100.
    Critical: -12, High: -8, Medium: -4, Low: -1. Minimum 0.
    """
    score = 100
    for col in collisions:
        sev = col.get("severity", "Low")
        if sev == "Critical":
            score -= 12
        elif sev == "High":
            score -= 8
        elif sev == "Medium":
            score -= 4
        else:
            score -= 1
    return max(0, score)


def detect_collisions(requirements: List[Dict[str, Any]]) -> Dict[str, Any]:
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
    all_collisions: List[Dict[str, Any]] = []
    llm_calls = 0

    # Batch the requirements to keep prompt size manageable
    batches = [
        requirements[i:i + MAX_REQS_PER_BATCH]
        for i in range(0, req_count, MAX_REQS_PER_BATCH)
    ]

    logger.info(
        f"[COLLISION] Processing {len(batches)} batch(es) "
        f"of up to {MAX_REQS_PER_BATCH} requirements each"
    )

    for batch_idx, batch in enumerate(batches):
        id_offset = batch_idx * 100
        logger.info(
            f"[COLLISION] Batch {batch_idx + 1}/{len(batches)}: "
            f"{len(batch)} requirements"
        )
        try:
            batch_collisions = _run_collision_batch(llm, batch, id_offset)
            all_collisions.extend(batch_collisions)
            llm_calls += 1
        except RuntimeError as e:
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
