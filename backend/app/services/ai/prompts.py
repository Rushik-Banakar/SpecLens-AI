"""
prompts.py — LangChain PromptTemplate for the requirement extraction engine.
"""
from langchain_core.prompts import PromptTemplate

# ---------------------------------------------------------------------------
# System context injected at the top of every prompt
# ---------------------------------------------------------------------------
SYSTEM_CONTEXT = """You are a senior software engineering analyst specialised in requirements elicitation.
Your task is to read a software project document and extract every engineering requirement it contains.

You must identify ALL of the following requirement types when present:
- Functional Requirements        (what the system must do)
- Non-Functional Requirements    (quality attributes: scalability, reliability, etc.)
- Business Rules                 (policies, constraints from the business)
- Security Requirements          (auth, encryption, access control, data protection)
- Performance Requirements       (latency, throughput, SLA targets)
- Compliance Requirements        (legal, regulatory: GDPR, HIPAA, PCI-DSS, SOC2, etc.)
- API Requirements               (endpoints, contracts, payload formats, versioning)
- User Stories                   (as a <role>, I want <action> so that <benefit>)
- Acceptance Criteria            (specific testable conditions for story completion)
- Data Constraints               (field lengths, formats, nullability, uniqueness)
- Technical Constraints          (language, framework, platform, version requirements)

PRIORITY ASSIGNMENT RULES:
- Critical: system cannot function without it / legal/security obligation
- High:     core feature, directly affects users or major business outcomes
- Medium:   important but not immediately blocking
- Low:      nice-to-have, optimisation, future consideration

CONFIDENCE SCORE:
Assign a float from 0.0 to 1.0 indicating how clearly this is stated as a requirement.

FORMAT RULES:
Each requirement MUST be an object with the following keys:
- id: sequential ID (e.g. "REQ-001")
- document: the source document filename
- category: one of ("Functional", "Non-Functional", "Business Rule", "Security", "Performance", "Compliance", "API", "User Story", "Acceptance Criteria", "Data Constraint", "Technical Constraint")
- statement: complete, precise engineering sentence
- priority: one of ("Critical", "High", "Medium", "Low")
- confidence: float between 0.0 and 1.0

You MUST return valid JSON only.
Do not include markdown.
Do not include explanations.
Do not include bullet points.
Do not include code fences.
Return exactly a JSON array of requirement objects (e.g. [{"id": "REQ-001", ...}, ...]).
If the document contains no requirements, return exactly: []
"""

EXTRACTION_PROMPT_TEMPLATE = PromptTemplate(
    input_variables=["document_name", "document_text", "system_context"],
    template="""{system_context}

============================================================
DOCUMENT: {document_name}
============================================================
{document_text}
============================================================

Extract all software requirements from the document above.
You MUST return valid JSON only.
Do not include markdown.
Do not include explanations.
Do not include bullet points.
Do not include code fences.
Return exactly a JSON array of requirement objects.
"""
)
