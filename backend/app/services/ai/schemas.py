"""
schemas.py — Pydantic models for the AI Requirement Extraction Engine.
These define the structured output contract for all AI extraction results.
"""
from typing import List, Literal, Optional
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
    requirements: List[Requirement]


class DocumentInput(BaseModel):
    """A single parsed document to be sent for AI extraction."""
    name: str
    text: str


class ExtractionRequest(BaseModel):
    """Request body for POST /api/extract-requirements."""
    documents: List[DocumentInput]


class ExtractionResponse(BaseModel):
    """Response from POST /api/extract-requirements."""
    success: bool
    requirements: List[Requirement]
    stats: dict
