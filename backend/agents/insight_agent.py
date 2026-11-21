"""Generate an executive summary from EDA and ML results using a language model or a statistical fallback."""
import json
import os
import re

class InsightAgent:
    def __init__(self, groq_api_key=None, groq_model=None):
        self.groq_api_key = groq_api_key or os.getenv('GROQ_API_KEY')
        self.groq_model = groq_model or os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b')

    def _call_llm(self, prompt, system_prompt):
        """Call the language model through the shared provider interface."""
        from providers import complete
        return complete(self, prompt, system_prompt)

    def generate_summary(self, eda_result, ml_result):
        """Combine EDA and ML outputs into an executive briefing."""
        eda, ml = eda_result or {}, ml_result or {}
        # Build the structured JSON prompt.
        prompt = json.dumps({'eda': eda, 'ml': ml}, ensure_ascii=False)
        system = (
            'Summarize only the provided observations. Respect per-analysis population counts. '
            'Unusual observations are not proven errors. Forecasts are unvalidated linear projections. '
            'Return JSON with string fields summary, key_finding, recommendation.'
        )

        # -------------------------------------------------------------
        # Try generating the summary with a language model.
        # -------------------------------------------------------------
        try:
            text = self._call_llm(prompt, system)
            # Remove Markdown code fences from the response.
            text = re.sub(r'^```(?:json)?\s*|\s*```$', '', text.strip())
            result = json.loads(text)
            if not all(isinstance(result.get(k), str) and result[k].strip() for k in ('summary', 'key_finding', 'recommendation')):
                raise ValueError('Invalid summary structure from LLM')
            return {
                k: result[k] for k in ('summary', 'key_finding', 'recommendation')
            } | {'generation_mode': 'language_provider'}

        # -------------------------------------------------------------
        # Step 2: Fallback (Deterministic Mode)
        # Use a rule-based summary when the provider is unavailable.
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
