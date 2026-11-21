"""
Insight / Business Summary Agent
--------------------------------
Ye agent EDA aur ML results ko study karke Executive Summary generate karta hai:
1. LLM Mode (Groq / Anthropic): AI model ko data dekar 3 key insights banwata hai:
   - summary: Poore dataset ka overview
   - key_finding: Sabse important business observation
   - recommendation: Decision-makers ke liye actionable advice
2. Fallback Mode: Agar AI down ho ya API key na ho, to pure statistical math se summary banata hai.
"""
import json
import os
import re

class InsightAgent:
    def __init__(self, anthropic_api_key=None, groq_api_key=None, anthropic_model=None, groq_model=None):
        self.anthropic_api_key = anthropic_api_key or os.getenv('ANTHROPIC_API_KEY')
        self.groq_api_key = groq_api_key or os.getenv('GROQ_API_KEY')
        self.anthropic_model = anthropic_model or os.getenv('ANTHROPIC_MODEL', 'claude-3-5-sonnet-latest')
        self.groq_model = groq_model or os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b')

    def _call_llm(self, prompt, system_prompt):
        """Unified provider interface se LLM call karta hai (Groq / Claude)."""
        from providers import complete
        return complete(self, prompt, system_prompt)

    def generate_summary(self, eda_result, ml_result):
        """
        EDA aur ML ke outputs ko combine karke executive briefing banata hai.
        """
        eda, ml = eda_result or {}, ml_result or {}
        # Structured JSON prompt LLM ke liye
        prompt = json.dumps({'eda': eda, 'ml': ml}, ensure_ascii=False)
        system = (
            'Summarize only the provided observations. Respect per-analysis population counts. '
            'Unusual observations are not proven errors. Forecasts are unvalidated linear projections. '
            'Return JSON with string fields summary, key_finding, recommendation.'
        )

        # -------------------------------------------------------------
        # Step 1: LLM se intelligent summary generate karne ki koshish karo
        # -------------------------------------------------------------
        try:
            text = self._call_llm(prompt, system)
            # Markdown fences (```json ... ```) clean karo
            text = re.sub(r'^```(?:json)?\s*|\s*```$', '', text.strip())
            result = json.loads(text)
            if not all(isinstance(result.get(k), str) and result[k].strip() for k in ('summary', 'key_finding', 'recommendation')):
                raise ValueError('Invalid summary structure from LLM')
            return {
                k: result[k] for k in ('summary', 'key_finding', 'recommendation')
            } | {'generation_mode': 'language_provider'}

        # -------------------------------------------------------------
        # Step 2: Fallback (Deterministic Mode)
        # Agar internet/API key fail ho, to rule-based fallback se user ko instant response milta hai
        # -------------------------------------------------------------
        except Exception:
            count = eda.get('stats_computed_on', {}).get('total_rows', 0)
            trends = eda.get('monthly_trend', [])
            finding = 'Numeric summaries use eligible values independently; no unusual observations were automatically deleted.'
            if trends:
                peak = max(trends, key=lambda t: t['total_revenue'])
                finding = f"Highest observed monthly metric: {peak['month']} ({peak['total_revenue']:,.2f}), using rows with valid dates and metrics."
            return {
                'summary': f'Analysis retains {count} observations. ' + finding,
                'key_finding': finding,
                'recommendation': 'Review flagged source values and analysis eligibility before making decisions. Treat projections as unvalidated scenarios.',
                'generation_mode': 'deterministic_fallback'
            }
