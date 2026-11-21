"""Provide a shared entry point for Groq with fallback between models."""
import logging

from config import Settings

logger = logging.getLogger(__name__)

def complete(owner, prompt, system_prompt):
    """Return the language model response without exposing credentials or provider errors."""
    timeout = Settings().llm_timeout

    # Try alternate models when the configured model is unavailable or rate-limited.
    if owner.groq_api_key and not owner.groq_api_key.startswith('your_'):
        models_to_try = [getattr(owner, 'groq_model', None), 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b']
        unique_models = [m for i, m in enumerate(models_to_try) if m and m not in models_to_try[:i]]
        try:
            from groq import Groq
            client = Groq(api_key=owner.groq_api_key, timeout=timeout, max_retries=1)
            for m in unique_models:
                try:
                    response = client.chat.completions.create(
                        model=m,
                        max_tokens=2048,
                        temperature=0,
                        messages=[
                            {'role': 'system', 'content': system_prompt},
                            {'role': 'user', 'content': prompt}
                        ]
                    )
                    text = (response.choices[0].message.content or '').strip()
                    if text:
                        return text
                except Exception as error:
                    logger.warning(
                        'Groq completion failed for %s: %s (HTTP status: %s)',
                        m, type(error).__name__, getattr(error, 'status_code', None),
                    )
        except Exception as error:
            logger.warning('Groq client initialization failed: %s', type(error).__name__)

    raise RuntimeError('Groq is unavailable or no Groq API key is configured.')
