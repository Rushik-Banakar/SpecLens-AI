"""Application settings and AI provider API key validation."""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()

_PLACEHOLDER_KEYS = {
    "your_gemini_api_key_here",
    "your_groq_api_key_here",
    "your_openrouter_api_key_here",
}


class Settings:
    """Load and validate AI provider credentials from environment variables."""

    def __init__(self) -> None:
        self.gemini_keys: list[str] = []
        self.groq_keys: list[str] = []
        self.openrouter_keys: list[str] = []

        gemini_primary = os.getenv("GEMINI_API_KEY_1")
        if _is_valid_key(gemini_primary):
            self.gemini_keys.append(gemini_primary.strip())

        gemini_secondary = os.getenv("GEMINI_API_KEY_2")
        if _is_valid_key(gemini_secondary):
            self.gemini_keys.append(gemini_secondary.strip())

        groq_primary = os.getenv("GROQ_API_KEY_1") or os.getenv("GROQ_API_KEY")
        if _is_valid_key(groq_primary):
            self.groq_keys.append(groq_primary.strip())

        groq_secondary = os.getenv("GROQ_API_KEY_2")
        if _is_valid_key(groq_secondary):
            self.groq_keys.append(groq_secondary.strip())

        openrouter_primary = os.getenv("OPENROUTER_API_KEY_1")
        if _is_valid_key(openrouter_primary):
            self.openrouter_keys.append(openrouter_primary.strip())

        openrouter_secondary = os.getenv("OPENROUTER_API_KEY_2")
        if _is_valid_key(openrouter_secondary):
            self.openrouter_keys.append(openrouter_secondary.strip())

    def validate(self) -> None:
        """Ensure at least one provider key is configured and log startup summary.

        Raises:
            RuntimeError: If no valid provider API keys are configured.
        """
        total_keys = len(self.gemini_keys) + len(self.groq_keys) + len(self.openrouter_keys)
        if total_keys == 0:
            raise RuntimeError(
                "CRITICAL ERROR: No AI provider API keys are configured. "
                "SpecLens AI requires at least one valid API key to function. "
                "Please configure GEMINI_API_KEY_1, GROQ_API_KEY_1, or OPENROUTER_API_KEY_1 in backend/.env"
            )

        _print_startup_status("Gemini", len(self.gemini_keys))
        _print_startup_status("Groq", len(self.groq_keys))
        _print_startup_status("OpenRouter", len(self.openrouter_keys))
        sys.stdout.flush()


def _is_valid_key(value: str | None) -> bool:
    """Return True when an environment value is a non-placeholder API key."""
    if not value or not value.strip():
        return False
    return value.strip() not in _PLACEHOLDER_KEYS


def _print_startup_status(provider: str, count: int) -> None:
    """Print provider key counts at startup (intentional console output)."""
    try:
        print(f"✓ {provider}: {count} keys loaded")
    except UnicodeEncodeError:
        print(f"[OK] {provider}: {count} keys loaded")


settings = Settings()
