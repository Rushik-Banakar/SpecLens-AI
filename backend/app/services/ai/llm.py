"""
llm.py — Shared LLM instance provider using Compatibility Wrapper.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("speclens.llm")


class CompatibilityLLM:
    """LangChain-compatible wrapper that routes requests to the ProviderManager."""

    def __init__(self, temperature: float = 0.1) -> None:
        self.temperature = temperature

    def invoke(self, messages: Any, *args: Any, **kwargs: Any) -> Any:
        # Translate LangChain messages to a single prompt string
        if isinstance(messages, list):
            # Extract content from each message
            parts = []
            for m in messages:
                if hasattr(m, "content"):
                    parts.append(m.content)
                elif isinstance(m, dict):
                    parts.append(m.get("content", ""))
                else:
                    parts.append(str(m))
            prompt = "\n".join(parts)
        elif hasattr(messages, "content"):
            prompt = messages.content
        else:
            prompt = str(messages)
        
        from app.services.ai.provider_manager import provider_manager
        response_content = provider_manager.generate(prompt, temperature=self.temperature)
        
        # Return something that looks like ChatGroq's response (with a .content attribute)
        class ResponseWrapper:
            def __init__(self, content):
                self.content = content
        return ResponseWrapper(response_content)

    def run(self, question: str, *args: Any, **kwargs: Any) -> str:
        from app.services.ai.provider_manager import provider_manager
        return provider_manager.generate(question, temperature=self.temperature)

def get_llm(temperature: float = 0.1) -> CompatibilityLLM:
    """Return a compatibility LLM wrapper with deterministic temperature defaults."""
    logger.info(f"[LLM] Returning CompatibilityLLM wrapper (temperature={temperature})...")
    return CompatibilityLLM(temperature=temperature)
