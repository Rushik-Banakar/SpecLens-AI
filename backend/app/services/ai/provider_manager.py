"""Production-ready multi-provider LLM routing with failover and key rotation."""

from __future__ import annotations

import json
import logging
import os
import socket
import sys
import time
import urllib.error
import urllib.request

from app.core.config import settings

logger = logging.getLogger("speclens.provider_manager")

COOLDOWN_DURATION = 300
HTTP_TIMEOUT_SECONDS = 30.0

# ===========================================================================
# Exception Hierarchy
# ===========================================================================

class ProviderError(Exception):
    """Base exception for all provider errors."""
    pass

class TransientAPIError(ProviderError):
    """Error for transient issues (5xx, network timeouts) that can be retried."""
    pass

class RateLimitError(ProviderError):
    """Error for rate limit, token limit, daily quota, or insufficient balance."""
    pass

class ContextLengthError(ProviderError):
    """Error when the context length is exceeded."""
    pass

class PermanentAPIError(ProviderError):
    """Error for bad requests, invalid key, or invalid configuration."""
    pass

class AllProvidersUnavailableError(Exception):
    """Raised when every configured provider key has failed or is on cooldown."""

    def __init__(self, providers_attempted: list[str]) -> None:
        self.providers_attempted = providers_attempted
        super().__init__(f"ALL_AI_PROVIDERS_UNAVAILABLE: Tried {providers_attempted}")


# ===========================================================================
# Base AI Provider & Concrete Adaptors
# ===========================================================================

class BaseAIProvider:
    """Interface for LLM API integration adapters."""

    def __init__(self, key_name: str, api_key: str) -> None:
        self.key_name = key_name
        self.api_key = api_key
        self.provider_type = "Base"

    def generate(self, prompt: str, temperature: float = 0.1) -> str:
        """Call the API endpoint and return the completed text response."""
        raise NotImplementedError("Subclasses must implement generate().")

    def _execute_http(
        self,
        url: str,
        headers: dict[str, str],
        payload: dict[str, object],
        timeout: float = HTTP_TIMEOUT_SECONDS,
    ) -> tuple[int, str]:
        """Execute an HTTP POST request with a timeout using the standard library.

        Args:
            url: Target API endpoint.
            headers: Request headers.
            payload: JSON-serialisable request body.
            timeout: Request timeout in seconds.

        Returns:
            A tuple of HTTP status code and response body text.
        """
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.status, response.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            status = e.code
            body = ""
            try:
                body = e.read().decode("utf-8")
            except Exception:
                pass
            return status, body
        except (urllib.error.URLError, socket.timeout, ConnectionError, TimeoutError) as e:
            # Re-raise as standard Python connection or timeout exception to catch at manager layer
            raise e


class GeminiProvider(BaseAIProvider):
    """Adapter for Google AI Studio Gemini API."""

    MODEL_FALLBACKS = (
        "gemini-2.0-flash",
        "gemini-flash-lite-latest",
        "gemini-2.0-flash-lite",
    )
    
    def __init__(self, key_name: str, api_key: str) -> None:
        super().__init__(key_name, api_key)
        self.provider_type = "Google Gemini"

    def _models_to_try(self) -> list[str]:
        primary = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        models = [primary]
        for candidate in self.MODEL_FALLBACKS:
            if candidate not in models:
                models.append(candidate)
        return models

    def _request_once(self, model: str, prompt: str, temperature: float) -> tuple[int, str]:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={self.api_key}"
        )
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "SpecLensAI/1.0",
        }
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature},
        }
        return self._execute_http(url, headers, payload)

    def generate(self, prompt: str, temperature: float = 0.1) -> str:
        last_status = 0
        last_body = ""

        for model in self._models_to_try():
            try:
                status, body = self._request_once(model, prompt, temperature)
            except Exception as e:
                raise TransientAPIError(f"Connection or timeout error: {e}")

            last_status, last_body = status, body

            if status == 200:
                try:
                    resp_json = json.loads(body)
                    return resp_json["candidates"][0]["content"]["parts"][0]["text"]
                except Exception as e:
                    raise PermanentAPIError(
                        f"Failed to parse Gemini success response: {e}. Raw: {body}"
                    )

            if status == 404:
                logger.warning("[Gemini] Model '%s' not found; trying next model.", model)
                continue

            if status == 429:
                logger.warning("[Gemini] Model '%s' rate-limited; trying next model.", model)
                continue

            break

        status, body = last_status, last_body
        if status == 429:
            raise RateLimitError("429 Rate Limit")
        
        # Check error message details
        body_lower = body.lower()
        if "quota" in body_lower or "limit" in body_lower or "rate" in body_lower:
            raise RateLimitError(f"Quota exceeded / Rate Limit ({status}): {body}")
        elif "context" in body_lower or "length" in body_lower or "token limit" in body_lower:
            raise ContextLengthError(f"Context length error ({status}): {body}")
        elif status in [500, 502, 503, 504]:
            raise TransientAPIError(f"Server Error ({status}): {body}")
        else:
            raise PermanentAPIError(f"API Error ({status}): {body}")


class GroqProvider(BaseAIProvider):
    """Adapter for Groq Chat Completions API."""
    
    def __init__(self, key_name: str, api_key: str) -> None:
        super().__init__(key_name, api_key)
        self.provider_type = "Groq"

    def generate(self, prompt: str, temperature: float = 0.1) -> str:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "SpecLensAI/1.0",
        }
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature
        }
        
        try:
            status, body = self._execute_http(url, headers, payload)
        except Exception as e:
            raise TransientAPIError(f"Connection or timeout error: {e}")
            
        if status == 200:
            try:
                resp_json = json.loads(body)
                return resp_json["choices"][0]["message"]["content"]
            except Exception as e:
                raise PermanentAPIError(f"Failed to parse Groq success response: {e}. Raw: {body}")
                
        # Error handling
        if status == 429:
            raise RateLimitError("429 Rate Limit")
            
        body_lower = body.lower()
        if "quota" in body_lower or "limit" in body_lower or "rate" in body_lower:
            raise RateLimitError(f"Quota exceeded / Rate Limit ({status}): {body}")
        elif "context" in body_lower or "length" in body_lower or "token limit" in body_lower:
            raise ContextLengthError(f"Context length error ({status}): {body}")
        elif status in [500, 502, 503, 504]:
            raise TransientAPIError(f"Server Error ({status}): {body}")
        else:
            raise PermanentAPIError(f"API Error ({status}): {body}")


class OpenRouterProvider(BaseAIProvider):
    """Adapter for OpenRouter Chat Completions API."""

    # Verified free models (fallback order) when the configured model is unavailable.
    FREE_MODEL_FALLBACKS = (
        "tencent/hy3:free",
        "poolside/laguna-xs-2.1:free",
        "cohere/north-mini-code:free",
        "openrouter/free",
    )
    
    def __init__(self, key_name: str, api_key: str) -> None:
        super().__init__(key_name, api_key)
        self.provider_type = "OpenRouter"

    def _models_to_try(self) -> list[str]:
        primary = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
        models = [primary]
        for candidate in self.FREE_MODEL_FALLBACKS:
            if candidate not in models:
                models.append(candidate)
        return models

    def _request_once(self, model: str, prompt: str, temperature: float) -> tuple[int, str]:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "SpecLens AI",
            "User-Agent": "SpecLensAI/1.0",
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }
        return self._execute_http(url, headers, payload)

    def generate(self, prompt: str, temperature: float = 0.1) -> str:
        last_status = 0
        last_body = ""
        models = self._models_to_try()

        for model in models:
            try:
                status, body = self._request_once(model, prompt, temperature)
            except Exception as e:
                raise TransientAPIError(f"Connection or timeout error: {e}")

            last_status, last_body = status, body

            if status == 200:
                try:
                    resp_json = json.loads(body)
                    return resp_json["choices"][0]["message"]["content"]
                except Exception as e:
                    raise PermanentAPIError(
                        f"Failed to parse OpenRouter success response: {e}. Raw: {body}"
                    )

            # Try next free model when primary is missing or temporarily rate-limited.
            if status in (404, 429):
                body_lower = body.lower()
                if status == 429 and (
                    "rate" in body_lower or "limit" in body_lower or "quota" in body_lower
                ):
                    logger.warning(
                        "[OpenRouter] Model '%s' rate-limited; trying next free model.",
                        model,
                    )
                    continue
                if status == 404:
                    logger.warning(
                        "[OpenRouter] Model '%s' not found; trying next free model.",
                        model,
                    )
                    continue

            break

        status, body = last_status, last_body
        if status in [429, 402]:
            raise RateLimitError(f"Quota/Limit or Insufficient Credits ({status}): {body}")
            
        body_lower = body.lower()
        if "quota" in body_lower or "limit" in body_lower or "rate" in body_lower or "credits" in body_lower or "balance" in body_lower:
            raise RateLimitError(f"Quota/Limit / Credits Exceeded ({status}): {body}")
        elif "context" in body_lower or "length" in body_lower or "token limit" in body_lower:
            raise ContextLengthError(f"Context length error ({status}): {body}")
        elif status in [500, 502, 503, 504]:
            raise TransientAPIError(f"Server Error ({status}): {body}")
        else:
            raise PermanentAPIError(f"API Error ({status}): {body}")


# ===========================================================================
# Provider Manager Coordinator
# ===========================================================================

class ProviderManager:
    """Manage prioritised LLM provider routing, rotation, and failover."""

    def __init__(self) -> None:
        self.providers: list[BaseAIProvider] = []
        self.failed_keys: dict[str, float] = {}
        self.cooldown_duration = COOLDOWN_DURATION
        self._initialize_providers()

    def _initialize_providers(self) -> None:
        """Initialise active providers based on priority order and config settings."""
        for i, key in enumerate(settings.gemini_keys):
            self.providers.append(GeminiProvider(f"Gemini Key {i+1}", key))
            
        for i, key in enumerate(settings.groq_keys):
            self.providers.append(GroqProvider(f"Groq Key {i+1}", key))
            
        for i, key in enumerate(settings.openrouter_keys):
            self.providers.append(OpenRouterProvider(f"OpenRouter Key {i+1}", key))

        logger.info(f"Initialized ProviderManager with {len(self.providers)} configured provider keys.")

    def is_key_available(self, key_name: str) -> bool:
        """Return True when a key is not on cooldown or its cooldown has expired."""
        if key_name not in self.failed_keys:
            return True
            
        cooldown_until = self.failed_keys[key_name]
        if time.time() > cooldown_until:
            logger.info(f"Cooldown expired for API key: {key_name}. Restoring availability.")
            del self.failed_keys[key_name]
            return True
            
        return False

    def generate(self, prompt: str, temperature: float = 0.1) -> str:
        """Execute prompt generation across prioritised provider keys with failover.

        Args:
            prompt: Full prompt text sent to the active provider.
            temperature: Sampling temperature passed to the provider API.

        Returns:
            Generated text from the first successful provider response.

        Raises:
            AllProvidersUnavailableError: When every provider attempt fails or is cooling down.
        """
        # Determine current available providers
        available_providers = [p for p in self.providers if self.is_key_available(p.key_name)]
        
        attempted_this_request = []
        
        # If no providers are configured or all are on cooldown
        if not available_providers:
            # Return list of all potential key names we wanted to attempt
            all_key_names = [
                "Gemini Key 1", "Gemini Key 2",
                "Groq Key 1", "Groq Key 2",
                "OpenRouter Key 1", "OpenRouter Key 2"
            ]
            raise AllProvidersUnavailableError(providers_attempted=all_key_names)

        for i, provider in enumerate(available_providers):
            attempted_this_request.append(provider.key_name)
            
            # Print Using Provider and API Key blocks
            print("\nUsing Provider:")
            print(provider.provider_type)
            print("\nUsing API Key:")
            print(provider.key_name)
            sys.stdout.flush()

            # Estimate prompt tokens (~4 chars per token)
            estimated_tokens = len(prompt) // 4
            
            t0 = time.time()
            success = False
            response_text = ""
            error_reason = ""
            is_transient = False

            try:
                response_text = provider.generate(prompt, temperature=temperature)
                success = True
            except TransientAPIError as e:
                error_reason = str(e)
                is_transient = True
            except (RateLimitError, ContextLengthError, PermanentAPIError) as e:
                error_reason = str(e)
                is_transient = False
            except Exception as e:
                error_reason = f"Unexpected Error: {e}"
                is_transient = True  # Treat unknown python errors/timeouts as transient to trigger retry

            # Handle transient retry
            if not success and is_transient:
                logger.warning(f"Transient failure on {provider.key_name}: {error_reason}. Retrying once...")
                try:
                    response_text = provider.generate(prompt, temperature=temperature)
                    success = True
                except Exception as retry_err:
                    error_reason = f"Retry Failed: {retry_err}"
                    # Now marked as failed since retry failed too

            elapsed = time.time() - t0

            if success:
                # Log success block
                print("\nPrompt Tokens:")
                print(estimated_tokens)
                print("\nResponse Time:")
                print(f"{elapsed:.2f}s")
                print("\nSuccess\n")
                sys.stdout.flush()
                return response_text
            else:
                # Mark key as failed/on cooldown
                self.failed_keys[provider.key_name] = time.time() + self.cooldown_duration
                
                # Determine failover error description for logs
                err_desc = "429 Rate Limit" if "429" in error_reason or "rate" in error_reason.lower() or "quota" in error_reason.lower() else "Transient Error"
                if "context" in error_reason.lower():
                    err_desc = "Context Length Error"
                
                # Print failover transition log block
                next_provider_name = ""
                # Find the next available provider that isn't the current one and isn't on cooldown
                for next_p in available_providers[i+1:]:
                    if self.is_key_available(next_p.key_name):
                        next_provider_name = next_p.key_name
                        break
                
                # If no remaining available providers in active list, list the next in sequence from absolute priorities
                if not next_provider_name:
                    all_key_names = [
                        "Gemini Key 1", "Gemini Key 2",
                        "Groq Key 1", "Groq Key 2",
                        "OpenRouter Key 1", "OpenRouter Key 2"
                    ]
                    try:
                        curr_idx = all_key_names.index(provider.key_name)
                        if curr_idx + 1 < len(all_key_names):
                            next_provider_name = all_key_names[curr_idx + 1]
                    except ValueError:
                        pass
                
                def safe_print_arrow():
                    try:
                        print("↓")
                    except UnicodeEncodeError:
                        print("v")

                print(f"\n{provider.key_name}")
                safe_print_arrow()
                print(err_desc)
                safe_print_arrow()
                if next_provider_name:
                    print(f"Switching to {next_provider_name}\n")
                else:
                    print("ALL_AI_PROVIDERS_UNAVAILABLE\n")
                sys.stdout.flush()
                
        # If we loop through all available and none succeeded
        # Construct full list of providers attempted (or all if none were available)
        raise AllProvidersUnavailableError(providers_attempted=attempted_this_request)


# Singleton instance exposed for global import
provider_manager = ProviderManager()
