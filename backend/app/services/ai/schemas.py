"""Pydantic models for AI requirement extraction request and response contracts."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# --- Requirement categories supported by the extractor ---
RequirementCategory = Literal[
    "Functional",
    "Non-Functional",
    "Business Rule",
    "Security",
    "Performance",
    "Compliance",
    "API",
    "User Story",
    "Acceptance Criteria",
    "Data Constraint",
    "Technical Constraint",
]

RequirementPriority = Literal["Critical", "High", "Medium", "Low"]


class Requirement(BaseModel):
    """A single extracted software requirement."""
    id: str = Field(description="Unique ID, e.g. REQ-001")
    document: str = Field(description="Source document filename")
    category: RequirementCategory = Field(description="Requirement category")
    statement: str = Field(description="The extracted requirement statement")
    priority: RequirementPriority = Field(description="Estimated priority level")
    confidence: float = Field(
        description="AI confidence score between 0.0 and 1.0",
        ge=0.0,
        le=1.0
    )


class ExtractionResult(BaseModel):
    """Complete result from the requirement extraction pipeline."""

    requirements: list[Requirement]


class DocumentInput(BaseModel):
    """A single parsed document to be sent for AI extraction."""

    name: str
    text: str


class ExtractionRequest(BaseModel):
    """Request body for POST /api/extract-requirements."""

    documents: list[DocumentInput]


class ExtractionResponse(BaseModel):
    """Response from POST /api/extract-requirements."""

    success: bool
    requirements: list[Requirement]
    stats: dict
