"""
LLM Provider Interface
----------------------
Ye file AI models (Anthropic Claude aur Groq) ko call karne ka single entry point hai.

Priority:
1. Anthropic Claude (agar key configured ho)
2. Groq Cascade (Owner Model -> openai/gpt-oss-120b -> qwen/qwen3.8-27b)
   Agar ek model fail ho ya unavailable ho, to automatically next available model try karta hai.
"""
from config import Settings

def complete(owner, prompt, system_prompt):
    """
    LLM ko call karke response string return karta hai.
    Credentials ya provider errors expose nahi karta.
    """
    timeout = Settings().llm_timeout

    # -------------------------------------------------------------
    # 1. Anthropic Claude Call (Agar key valid ho)
    # -------------------------------------------------------------
    if owner.anthropic_api_key and not owner.anthropic_api_key.startswith('your_'):
        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=owner.anthropic_api_key, timeout=timeout, max_retries=1)
            response = client.messages.create(
                model=owner.anthropic_model,
                max_tokens=2048,
                system=system_prompt,
                messages=[{'role': 'user', 'content': prompt}]
            )
            text = ''.join(getattr(c, 'text', '') for c in response.content).strip()
            if text:
                return text
        except Exception:
            pass

    # -------------------------------------------------------------
    # 2. Groq Cascade Call (Multiple model fallbacks)
    # Agar configured model 404 ya rate limit ho, to automatic alternate models use hote hain
    # -------------------------------------------------------------
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
                except Exception:
                    continue
        except Exception:
            pass

    raise RuntimeError('Configured language providers are unavailable or no API key is configured.')
