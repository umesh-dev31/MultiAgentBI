"""One bounded provider interface, without provider errors or credentials in responses."""
from config import Settings

def complete(owner,prompt,system_prompt):
    timeout = Settings().llm_timeout
    if owner.anthropic_api_key and not owner.anthropic_api_key.startswith('your_'):
        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=owner.anthropic_api_key,timeout=timeout,max_retries=1)
            response = client.messages.create(model=owner.anthropic_model,max_tokens=2048,system=system_prompt,messages=[{'role':'user','content':prompt}])
            text = ''.join(getattr(c,'text','') for c in response.content).strip()
            if text:
                return text
        except Exception:
            pass
    if owner.groq_api_key and not owner.groq_api_key.startswith('your_'):
        models_to_try = [getattr(owner, 'groq_model', None), 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b']
        unique_models = [m for i, m in enumerate(models_to_try) if m and m not in models_to_try[:i]]
        try:
            from groq import Groq
            client = Groq(api_key=owner.groq_api_key,timeout=timeout,max_retries=1)
            for m in unique_models:
                try:
                    response = client.chat.completions.create(model=m,max_tokens=2048,temperature=0,messages=[{'role':'system','content':system_prompt},{'role':'user','content':prompt}])
                    text = (response.choices[0].message.content or '').strip()
                    if text:
                        return text
                except Exception:
                    continue
        except Exception:
            pass
    raise RuntimeError('Configured language providers are unavailable or no API key is configured.')
