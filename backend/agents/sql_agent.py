import os
import re
import sqlite3
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
from agents.validation import validated_subset
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

class SQLAgent:
    """Standalone SQL Agent that translates natural language questions into valid,
    safe SQLite SELECT queries, executes them against an in-memory validated database,
    and returns tabular results with single-attempt error retry.
    """

    FORBIDDEN_KEYWORDS = [
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
        "ATTACH", "DETACH", "CREATE", "REPLACE", "EXEC", "EXECUTE",
        "PRAGMA", "GRANT", "REVOKE", "INTO"
    ]

    def __init__(
        self,
        anthropic_api_key: Optional[str] = None,
        groq_api_key: Optional[str] = None,
        groq_model: Optional[str] = None,
        anthropic_model: Optional[str] = None,
    ):
        self.anthropic_api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        self.groq_api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        self.groq_model = groq_model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        self.anthropic_model = anthropic_model or os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")

    def _filter_validated_subset(self, df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        return validated_subset(df, quality_report)

    def _extract_schema(self, df: pd.DataFrame) -> str:
        """Extracts table schema with column names, data types, and sample distinct values."""
        schema_lines = ["Table: orders", "Columns:"]
        for col in df.columns:
            dtype = str(df[col].dtype)
            sample_vals = df[col].dropna().unique()[:3]
            sample_str = ", ".join([repr(v) for v in sample_vals])
            schema_lines.append(f"  - {col} ({dtype}) [e.g.: {sample_str}]")
        return "\n".join(schema_lines)

    def _clean_sql(self, raw_output: str) -> str:
        """Removes markdown code fences, comments, thought tags, and trailing whitespace from LLM output."""
        if not raw_output:
            return ""
        text = raw_output.strip()
        # Remove <think>...</think> tags if present
        text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE).strip()
        # Extract content inside ```sql ... ``` or ``` ... ```
        match = re.search(r"```(?:sql)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if match:
            text = match.group(1).strip()
        # Remove any single-line comments (-- ...)
        lines = []
        for line in text.splitlines():
            clean_l = line.strip()
            if clean_l:
                lines.append(clean_l)
        cleaned = " ".join(lines).strip()
        # Ensure trailing semicolon is cleaned
        return cleaned.rstrip(";")

    def _validate_sql_safety(self, sql):
        try:
            import sqlglot
            from sqlglot import exp
            statements = sqlglot.parse(sql, read='sqlite')
            if len(statements) != 1 or not isinstance(statements[0], (exp.Select, exp.Union, exp.Intersect, exp.Except)):
                return False, 'Only one read-only SELECT query is permitted.'
            forbidden = (exp.Insert, exp.Update, exp.Delete, exp.Create, exp.Drop, exp.Alter, exp.Command)
            if any(isinstance(node, forbidden) for node in statements[0].walk()):
                return False, 'Modifying SQL is forbidden.'
            return True, None
        except Exception:
            return False, 'Invalid or unsupported SQL.'

    def _call_llm(self, prompt: str, system_prompt: str) -> str:
        from providers import complete
        return complete(self, prompt, system_prompt)

    def _match_deterministic_query(self, question: str, df: pd.DataFrame) -> Optional[str]:
        """Detects standard schema-agnostic or common user inquiries to generate guaranteed valid SQL."""
        q = question.strip().lower()
        q = q.strip(' ?.!')
        m = re.fullmatch(r'(?:show (?:me )?)?(?:the )?(?:first|top) (\d+) rows?', q)
        if m:
            return f'SELECT * FROM orders LIMIT {min(int(m[1]), 10000)}'
        if q in {'sample rows','preview rows','show me 10 rows'}:
            return 'SELECT * FROM orders LIMIT 10'
        if q in {'total number of records','what is the total number of records','total number of rows','total count','how many rows','how many records','count of records','row count'}:
            return 'SELECT COUNT(*) AS total_records FROM orders'
        m = re.fullmatch(r'how many (?:rows|records) (?:have|where) ([a-z_]+) (>=|<=|!=|=|>|<) (-?\d+(?:\.\d+)?)', q)
        if m:
            col = next((c for c in df.columns if c.lower()==m[1]),None)
            if col:
                quoted = '"'+col.replace('"','""')+'"'
                return f'SELECT COUNT(*) AS total_records FROM orders WHERE {quoted} {m[2]} {float(m[3])}'
        def quote(name):
            return '"' + str(name).replace('"', '""') + '"'
        columns = {str(c).lower(): c for c in df.columns}
        revenue = next((columns[c] for c in ["revenue", "sales", "amount", "total"] if c in columns), None)
        qty = next((columns[c] for c in ["quantity", "qty"] if c in columns), None)
        price = next((columns[c] for c in ["unit_price", "price"] if c in columns), None)
        revenue_expr = quote(revenue) if revenue else (f"{quote(qty)} * {quote(price)}" if qty and price else None)
        group_match = re.search(r"\b(?:by|per|each)\s+(?:the\s+)?([a-z_]+)", q)
        group = None
        if group_match:
            word = group_match.group(1)
            group = columns.get(word) or columns.get(word.rstrip('s'))
        simple_total = re.fullmatch(r"(?:what (?:is|are) (?:the )?|show (?:me )?)?(?:total |sum of )?(?:revenue|sales|amount) (?:by|per|for each) (?:the )?[a-z_]+", q.strip(" ?.!"))
        if group and revenue_expr and simple_total:
            return f"SELECT {quote(group)}, SUM({revenue_expr}) AS total_revenue FROM orders GROUP BY {quote(group)} ORDER BY total_revenue DESC"
        customer = next((columns[c] for c in ["customer", "customer_name"] if c in columns), None)
        top_match = re.search(r"\btop\s+(\d+)\s+customers?", q)
        simple_top = re.fullmatch(r"(?:show (?:me )?)?top \d+ customers? by (?:order count|number of orders)", q.strip(" ?.!"))
        if customer and top_match and simple_top:
            limit = min(int(top_match.group(1)), 1000)
            return f"SELECT {quote(customer)}, COUNT(*) AS order_count FROM orders GROUP BY {quote(customer)} ORDER BY order_count DESC LIMIT {limit}"
        return None

    def _execute_sql(self, conn, sql):
        import json
        import time
        self._truncated = False
        safe, error = self._validate_sql_safety(sql)
        if not safe:
            return [], error
        deadline = time.monotonic()+float(os.getenv('SQL_TIMEOUT_SECONDS','2'))
        max_rows = int(os.getenv('SQL_MAX_ROWS','10000'))
        max_bytes = int(os.getenv('SQL_MAX_BYTES', str(5*1024*1024)))
        allowed = {sqlite3.SQLITE_SELECT,sqlite3.SQLITE_READ,sqlite3.SQLITE_FUNCTION,sqlite3.SQLITE_RECURSIVE}
        def authorize(action, arg1, arg2, database, trigger):
            if action not in allowed:
                return sqlite3.SQLITE_DENY
            if action==sqlite3.SQLITE_READ and arg1!='orders':
                return sqlite3.SQLITE_DENY
            if action==sqlite3.SQLITE_FUNCTION and str(arg2).lower() in {'load_extension','readfile','writefile'}:
                return sqlite3.SQLITE_DENY
            return sqlite3.SQLITE_OK
        try:
            conn.execute('PRAGMA query_only=ON')
            conn.setlimit(sqlite3.SQLITE_LIMIT_LENGTH,max(max_bytes,1024*1024))
            conn.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH,100000)
            conn.set_authorizer(authorize)
            conn.set_progress_handler(lambda: int(time.monotonic()>deadline),1000)
            cursor = conn.execute(sql)
            names = [d[0] for d in cursor.description]
            output, size = [], 2
            while True:
                row = cursor.fetchone()
                if row is None:
                    break
                record = dict(zip(names,row))
                size += len(json.dumps(record,ensure_ascii=False,allow_nan=False).encode('utf-8'))+2
                if len(output)>=max_rows or size>max_bytes:
                    self._truncated = True
                    break
                output.append(record)
            return output, None
        except Exception:
            return [], 'SQL execution rejected, exceeded its budget, or failed.'
        finally:
            conn.set_authorizer(None)
            conn.set_progress_handler(None,0)

    def generate_and_run(self, question, df, quality_report=None):
        from agents.validation import eligible_subset,numeric_columns
        population = eligible_subset(df)[1] if df is not None else {}
        result = {'question':question,'generated_sql':'','result':[],'row_count':0,'error':None,'truncated':False,'population':population}
        if df is None or df.empty or not question.strip():
            return dict(result,error='A nonempty question and dataset are required.')
        with sqlite3.connect(':memory:') as conn:
            # SQL sees all source rows. Numeric conversion failures are SQL NULL, not deleted rows.
            sql_frame = df.copy()
            column_populations = {}
            for col in numeric_columns(df):
                eligible,column_populations[col] = eligible_subset(df,[col])
                source = set(eligible.attrs['source_rows'])
                sql_frame[col] = pd.to_numeric(sql_frame[col],errors='coerce').where([r in source for r in df.attrs.get('source_rows',range(2,len(df)+2))])
            result['column_populations'] = column_populations
            sql_frame.to_sql('orders',conn,index=False)
            schema = self._extract_schema(df)
            system = 'Generate one read-only SQLite SELECT query against orders. Output SQL only. Use the provided column names exactly.'
            prompt = f'Schema:\n{schema}\nQuestion: {question}'
            sql = self._match_deterministic_query(question,df)
            for attempt in range(2):
                if not sql:
                    try:
                        sql = self._clean_sql(self._call_llm(prompt,system))
                    except Exception:
                        return dict(result,error='Language provider unavailable for this question.')
                rows,error = self._execute_sql(conn,sql)
                if error is None:
                    return dict(result,generated_sql=sql,result=rows,row_count=len(rows),truncated=self._truncated,error=None)
                result.update(generated_sql=sql,error=error)
                prompt = f'{prompt}\nCorrect this failed query: {sql}\nOnly return a read-only SELECT.'
                sql = None
            return result

    def get_default_fallback_questions(self) -> List[Dict[str, str]]:
        """Returns generic, schema-agnostic business questions when no dataset is loaded
        or when schema-specific generation cannot be performed.
        """
        return [
            {
                "title": "Show me the first 10 rows",
                "description": "Displays the initial sample of rows from the active table",
                "icon": "📋",
            },
            {
                "title": "What is the total number of records?",
                "description": "Counts the total rows loaded in the current dataset",
                "icon": "🔢",
            },
            {
                "title": "What are the column summary statistics?",
                "description": "Computes aggregate ranges and distribution metrics",
                "icon": "📊",
            },
            {
                "title": "Find any records with missing or empty values",
                "description": "Scans columns for null or unpopulated entries",
                "icon": "🔍",
            },
        ]

    def _generate_deterministic_questions(self, df: pd.DataFrame) -> List[Dict[str, str]]:
        """Generates 3-4 schema-grounded fallback questions based on actual column inspection."""
        if df is None or df.empty:
            return self.get_default_fallback_questions()

        cols = list(df.columns)
        numeric_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c]) and not str(c).lower().endswith("_id")]
        date_cols = [c for c in cols if any(k in str(c).lower() for k in ["date", "month", "year", "time", "period"])]
        cat_cols = [c for c in cols if c not in numeric_cols and c not in date_cols and not str(c).lower().endswith("_id")]

        questions = []

        # Case 1: Temporal + Metric
        if date_cols and numeric_cols:
            d_col = date_cols[0]
            m_col = numeric_cols[0]
            questions.append({
                "title": f"Total {m_col} by {d_col}",
                "description": f"Aggregates {m_col.lower()} performance over {d_col.lower()} periods",
                "icon": "📈",
            })
            if len(numeric_cols) > 1:
                m2_col = numeric_cols[1]
                questions.append({
                    "title": f"Comparison of {m_col} and {m2_col} by {d_col}",
                    "description": f"Tracks {m_col.lower()} alongside {m2_col.lower()} across {d_col.lower()}",
                    "icon": "⚖️",
                })
            else:
                questions.append({
                    "title": f"Highest {m_col} recorded by {d_col}",
                    "description": f"Finds peak {d_col.lower()} based on {m_col.lower()}",
                    "icon": "🏆",
                })

        # Case 2: Categorical + Metric
        if cat_cols and numeric_cols:
            c_col = cat_cols[0]
            m_col = numeric_cols[0]
            questions.append({
                "title": f"Average {m_col} grouped by {c_col}",
                "description": f"Breaks down average {m_col.lower()} across different {c_col.lower()} categories",
                "icon": "📊",
            })
            questions.append({
                "title": f"Top 5 {c_col} ranked by {m_col}",
                "description": f"Identifies leading {c_col.lower()} performers by total {m_col.lower()}",
                "icon": "🥇",
            })

        # Case 3: Multiple metrics without categorical
        if not cat_cols and len(numeric_cols) >= 2 and len(questions) < 3:
            m1, m2 = numeric_cols[0], numeric_cols[1]
            questions.append({
                "title": f"Average and maximum of {m1} and {m2}",
                "description": f"Summary statistics for key metrics {m1} and {m2}",
                "icon": "📈",
            })

        # Pad to 4 questions if needed
        if len(questions) < 4 and numeric_cols:
            m_col = numeric_cols[0]
            questions.append({
                "title": f"Distribution and range of {m_col}",
                "description": f"Minimum, average, and maximum {m_col.lower()} across all rows",
                "icon": "📐",
            })

        if len(questions) < 4:
            for q in self.get_default_fallback_questions():
                if len(questions) >= 4:
                    break
                if not any(existing["title"] == q["title"] for existing in questions):
                    questions.append(q)

        return questions[:4]

    def generate_suggested_questions(
        self, df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """Dynamically generates 3-4 schema-relevant business questions based on
        the actual column names, types, and samples of the provided dataset using the LLM.
        """
        if df is None or df.empty:
            return self.get_default_fallback_questions()

        # Build clean schema summary
        col_summaries = []
        for c in df.columns:
            dtype_str = str(df[c].dtype)
            sample_vals = [str(x) for x in df[c].dropna().head(2).tolist()]
            sample_str = ", ".join(sample_vals) if sample_vals else "empty"
            col_summaries.append(f"- '{c}' ({dtype_str}, sample values: [{sample_str}])")
        schema_text = "\n".join(col_summaries)

        system_prompt = (
            "You are an expert Business Intelligence advisor and SQL specialist. "
            "Given the exact column names, data types, and sample values of a loaded dataset, "
            "generate 3 to 4 natural, insightful, executive-level business questions that a manager "
            "would ask about this data.\n\n"
            "STRICT RULES:\n"
            "1. You MUST ONLY reference columns that ACTUALLY exist in the provided schema. NEVER invent or assume columns like 'region', 'product', 'customer', or 'revenue' unless they are explicitly in the schema.\n"
            "2. Each question must be answerable using a single SQLite query against the table 'data' (or 'orders').\n"
            "3. Make questions diverse: e.g. temporal trends, rankings, aggregations, ratios/differences, or averages.\n"
            "4. Return ONLY a strict JSON array of 3 to 4 objects. Each object MUST have:\n"
            "   - 'title': The concise natural-language business question (e.g., 'What is the total Revenue by Month?')\n"
            "   - 'description': A 1-sentence explanation of what the question reveals.\n"
            "   - 'icon': A single relevant emoji representing the query (e.g. 📈, 💰, 📊, 👥, 🏆, 📦)."
        )

        user_prompt = (
            f"Here is the schema and sample data for the currently loaded table:\n\n"
            f"{schema_text}\n\n"
            f"Generate 3 to 4 tailored business questions now. Return strictly a JSON array."
        )

        try:
            raw_resp = self._call_llm(user_prompt, system_prompt)
            raw_resp = re.sub(r"<think>[\s\S]*?</think>", "", raw_resp, flags=re.IGNORECASE).strip()
            cleaned_resp = raw_resp.strip()
            arr_match = re.search(r"\[\s*\{.*\}\s*\]", cleaned_resp, re.DOTALL)
            if arr_match:
                cleaned_resp = arr_match.group(0)

            import json
            parsed = json.loads(cleaned_resp)
            if isinstance(parsed, list) and len(parsed) >= 2:
                valid_questions = []
                for item in parsed:
                    if isinstance(item, dict) and item.get("title") and item.get("description"):
                        title = str(item["title"]).strip()
                        desc = str(item["description"]).strip()
                        icon = str(item.get("icon", "📊")).strip()
                        valid_questions.append({
                            "title": title,
                            "description": desc,
                            "icon": icon or "📊",
                        })
                if len(valid_questions) >= 3:
                    return valid_questions[:4]
        except Exception:
            pass

        # Fall back to schema-grounded deterministic questions
        return self._generate_deterministic_questions(df)

