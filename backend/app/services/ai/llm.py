"""LangChain-compatible LLM wrapper backed by the shared ProviderManager."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("speclens.llm")


class CompatibilityLLM:
    """LangChain-compatible wrapper that routes requests to the ProviderManager."""

    def __init__(self, temperature: float = 0.1) -> None:
        """Initialise the wrapper with a default sampling temperature."""
        self.temperature = temperature

    def invoke(self, messages: Any, *args: Any, **kwargs: Any) -> Any:
        """Translate LangChain-style messages into a provider prompt and invoke the LLM.

        Args:
            messages: A LangChain message, message list, dict, or plain string.
            *args: Unused positional arguments for LangChain compatibility.
            **kwargs: Unused keyword arguments for LangChain compatibility.

        Returns:
            A lightweight object with a ``content`` attribute containing the response text.
        """
        if isinstance(messages, list):
            parts: list[str] = []
            for message in messages:
                if hasattr(message, "content"):
                    parts.append(message.content)
                elif isinstance(message, dict):
                    parts.append(message.get("content", ""))
                else:
                    parts.append(str(message))
            prompt = "\n".join(parts)
        elif hasattr(messages, "content"):
            prompt = messages.content
        else:
            prompt = str(messages)

        from app.services.ai.provider_manager import provider_manager

        response_content = provider_manager.generate(prompt, temperature=self.temperature)

        class ResponseWrapper:
            """Minimal response object exposing ``content`` for LangChain callers."""

            def __init__(self, content: str) -> None:
                self.content = content

        return ResponseWrapper(response_content)

    def run(self, question: str, *args: Any, **kwargs: Any) -> str:
        """Run a single-string prompt through the ProviderManager.

        Args:
            question: User question or instruction text.
            *args: Unused positional arguments for LangChain compatibility.
            **kwargs: Unused keyword arguments for LangChain compatibility.

        Returns:
            Generated response text.
        """
        from app.services.ai.provider_manager import provider_manager

        return provider_manager.generate(question, temperature=self.temperature)


def get_llm(temperature: float = 0.1) -> CompatibilityLLM:
    """Return a compatibility LLM wrapper with deterministic temperature defaults.

    Args:
        temperature: Sampling temperature forwarded to provider calls.

    Returns:
        Configured ``CompatibilityLLM`` instance.
    """
    logger.info("[LLM] Returning CompatibilityLLM wrapper (temperature=%s)...", temperature)
    return CompatibilityLLM(temperature=temperature)
