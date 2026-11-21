"""Convert natural-language questions to read-only SQLite queries. Use deterministic SQL for common questions, validate query structure, and retry once after a failed generated query."""
import os
import re
import sqlite3
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
from agents.validation import validated_subset
from dotenv import load_dotenv

load_dotenv()

class SQLAgent:
    # Prohibit keywords that could change data or database state.
    FORBIDDEN_KEYWORDS = [
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
        "ATTACH", "DETACH", "CREATE", "REPLACE", "EXEC", "EXECUTE",
        "PRAGMA", "GRANT", "REVOKE", "INTO"
    ]

    def __init__(
        self,
        groq_api_key: Optional[str] = None,
        groq_model: Optional[str] = None,
    ):
        self.groq_api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        self.groq_model = groq_model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    def _filter_validated_subset(self, df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        """Return a safe copy of the DataFrame."""
        return validated_subset(df, quality_report)

    def _extract_schema(self, df: pd.DataFrame) -> str:
        """Describe columns, data types, and up to three sample values per column for the language model."""
        schema_lines = ["Table: orders", "Columns:"]
        for col in df.columns:
            dtype = str(df[col].dtype)
            sample_vals = df[col].dropna().unique()[:3]
            sample_str = ", ".join([repr(v) for v in sample_vals])
            schema_lines.append(f"  - {col} ({dtype}) [e.g.: {sample_str}]")
        return "\n".join(schema_lines)

    def _clean_sql(self, raw_output: str) -> str:
        """Extract SQL from the model response by removing Markdown fences, think tags, and comments."""
        if not raw_output:
            return ""
        text = raw_output.strip()
        # Reasoning models ke <think> tags hatao
        text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE).strip()
        # Extract SQL from a Markdown code fence.
        match = re.search(r"```(?:sql)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if match:
            text = match.group(1).strip()
        # Clean the lines and remove the trailing semicolon.
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        cleaned = " ".join(lines).strip()
        return cleaned.rstrip(";")

    def _validate_sql_safety(self, sql):
        """Use SQLGlot to validate the syntax tree and allow only a single read-only SELECT or UNION query."""
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
        """Call the language model through the shared provider interface."""
        from providers import complete
        return complete(self, prompt, system_prompt)

    def _match_deterministic_query(self, question: str, df: pd.DataFrame) -> Optional[str]:
        """Generate deterministic SQL for common questions without calling a language model."""
        q = question.strip().lower().strip(' ?.! ')

        # 1. Preview rows (e.g. 'show me first 10 rows')
        m = re.fullmatch(r'(?:show (?:me )?)?(?:the )?(?:first|top) (\d+) rows?', q)
        if m:
            return f'SELECT * FROM orders LIMIT {min(int(m[1]), 10000)}'
        if q in {'sample rows', 'preview rows', 'show me 10 rows'}:
            return 'SELECT * FROM orders LIMIT 10'

        # 2. Total record count
        if q in {'total number of records', 'what is the total number of records', 'total number of rows', 'total count', 'how many rows', 'how many records', 'count of records', 'row count'}:
            return 'SELECT COUNT(*) AS total_records FROM orders'

        # 3. Simple condition count (e.g. 'how many rows have revenue > 100')
        m = re.fullmatch(r'how many (?:rows|records) (?:have|where) ([a-z_]+) (>=|<=|!=|=|>|<) (-?\d+(?:\.\d+)?)', q)
        if m:
            col = next((c for c in df.columns if c.lower() == m[1]), None)
            if col:
                quoted = '"' + col.replace('"', '""') + '"'
                return f'SELECT COUNT(*) AS total_records FROM orders WHERE {quoted} {m[2]} {float(m[3])}'

        # 4. Group by aggregation (e.g. 'total revenue by category')
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

        # 5. Top customers by orders
        customer = next((columns[c] for c in ["customer", "customer_name"] if c in columns), None)
        top_match = re.search(r"\btop\s+(\d+)\s+customers?", q)
        simple_top = re.fullmatch(r"(?:show (?:me )?)?top \d+ customers? by (?:order count|number of orders)", q.strip(" ?.!"))
        if customer and top_match and simple_top:
            limit = min(int(top_match.group(1)), 1000)
            return f"SELECT {quote(customer)}, COUNT(*) AS order_count FROM orders GROUP BY {quote(customer)} ORDER BY order_count DESC LIMIT {limit}"

        return None

    def _execute_sql(self, conn, sql):
        """Run the query in SQLite memory with a read-only authorizer, execution timeout, and bounded results."""
        import json
        import time
        self._truncated = False

        # Validate the SQL syntax tree before running it.
        safe, error = self._validate_sql_safety(sql)
        if not safe:
            return [], error

        deadline = time.monotonic() + float(os.getenv('SQL_TIMEOUT_SECONDS', '2'))
        max_rows = int(os.getenv('SQL_MAX_ROWS', '10000'))
        max_bytes = int(os.getenv('SQL_MAX_BYTES', str(5 * 1024 * 1024)))
        allowed = {sqlite3.SQLITE_SELECT, sqlite3.SQLITE_READ, sqlite3.SQLITE_FUNCTION, sqlite3.SQLITE_RECURSIVE}

        def authorize(action, arg1, arg2, database, trigger):
            if action not in allowed:
                return sqlite3.SQLITE_DENY
            if action == sqlite3.SQLITE_READ and arg1 != 'orders':
                return sqlite3.SQLITE_DENY
            if action == sqlite3.SQLITE_FUNCTION and str(arg2).lower() in {'load_extension', 'readfile', 'writefile'}:
                return sqlite3.SQLITE_DENY
            return sqlite3.SQLITE_OK

        try:
            conn.execute('PRAGMA query_only=ON')
            conn.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, max(max_bytes, 1024 * 1024))
            conn.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH, 100000)
            conn.set_authorizer(authorize)
            # 2 second timeout check
            conn.set_progress_handler(lambda: int(time.monotonic() > deadline), 1000)

            cursor = conn.execute(sql)
            names = [d[0] for d in cursor.description]
            output, size = [], 2
            while True:
                row = cursor.fetchone()
                if row is None:
                    break
                record = dict(zip(names, row))
                size += len(json.dumps(record, ensure_ascii=False, allow_nan=False).encode('utf-8')) + 2
                if len(output) >= max_rows or size > max_bytes:
                    self._truncated = True
                    break
                output.append(record)
            return output, None
        except Exception:
            return [], 'SQL execution rejected, exceeded its budget, or failed.'
        finally:
            conn.set_authorizer(None)
            conn.set_progress_handler(None, 0)

    def generate_and_run(self, question, df, quality_report=None):
        """Load the DataFrame into the in-memory orders table, generate and run SQL, and retry on failure."""
        from agents.validation import eligible_subset, numeric_columns
        population = eligible_subset(df)[1] if df is not None else {}
        result = {
            'question': question,
            'generated_sql': '',
            'result': [],
            'row_count': 0,
            'error': None,
            'truncated': False,
            'population': population
        }

        if df is None or df.empty or not question.strip():
            return dict(result, error='A nonempty question and dataset are required.')

        with sqlite3.connect(':memory:') as conn:
            # Keep all rows visible in SQL and represent invalid conversions as NULL.
            sql_frame = df.copy()
            column_populations = {}
            for col in numeric_columns(df):
                eligible, column_populations[col] = eligible_subset(df, [col])
                source = set(eligible.attrs['source_rows'])
                sql_frame[col] = pd.to_numeric(sql_frame[col], errors='coerce').where(
                    [r in source for r in df.attrs.get('source_rows', range(2, len(df) + 2))]
                )
            result['column_populations'] = column_populations
            sql_frame.to_sql('orders', conn, index=False)

            schema = self._extract_schema(df)
            system = 'Generate one read-only SQLite SELECT query against orders. Output SQL only. Use the provided column names exactly.'
            prompt = f'Schema:\n{schema}\nQuestion: {question}'

            # Try the deterministic pattern match first.
            sql = self._match_deterministic_query(question, df)

            # Allow two attempts: the initial query and one correction after failure.
            for attempt in range(2):
                if not sql:
                    try:
                        sql = self._clean_sql(self._call_llm(prompt, system))
                    except Exception:
                        return dict(result, error='Language provider unavailable for this question.')

                rows, error = self._execute_sql(conn, sql)
                # Return the result rows after a successful query.
                if error is None:
                    return dict(result, generated_sql=sql, result=rows, row_count=len(rows), truncated=self._truncated, error=None)

                # Send the error to the language model to request a correction.
                result.update(generated_sql=sql, error=error)
                prompt = f'{prompt}\nCorrect this failed query: {sql}\nError was: {error}\nOnly return a read-only SELECT.'
                sql = None

            return result

    def get_default_fallback_questions(self) -> List[Dict[str, str]]:
        """Starter questions jab koi dataset loaded na ho ya questions generate na ho sakein."""
        return [
            {"title": "Show me the first 10 rows", "description": "Displays the initial sample of rows from the active table", "icon": "📋"},
            {"title": "What is the total number of records?", "description": "Counts the total rows loaded in the current dataset", "icon": "🔢"},
            {"title": "What are the column summary statistics?", "description": "Computes aggregate ranges and distribution metrics", "icon": "📊"},
            {"title": "Find any records with missing or empty values", "description": "Scans columns for null or unpopulated entries", "icon": "🔍"},
        ]

    def _generate_deterministic_questions(self, df: pd.DataFrame) -> List[Dict[str, str]]:
        """Inspect the dataset columns to suggest starter questions."""
        if df is None or df.empty:
            return self.get_default_fallback_questions()

        cols = list(df.columns)
        numeric_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c]) and not str(c).lower().endswith("_id")]
        date_cols = [c for c in cols if any(k in str(c).lower() for k in ["date", "month", "year", "time", "period"])]
        cat_cols = [c for c in cols if c not in numeric_cols and c not in date_cols and not str(c).lower().endswith("_id")]

        questions = []

        # 1. Date + Numeric Column (e.g. Total quantity by order_date)
        if date_cols and numeric_cols:
            d_col, m_col = date_cols[0], numeric_cols[0]
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

        # 2. Categorical + Numeric Column (e.g. Average quantity grouped by category)
        if cat_cols and numeric_cols:
            c_col, m_col = cat_cols[0], numeric_cols[0]
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

        # Fallback padding to 4 questions
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
        """Generate questions based on the dataset schema and use a deterministic fallback if the provider fails."""
        if df is None or df.empty:
            return self.get_default_fallback_questions()

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
            "1. You MUST ONLY reference columns that ACTUALLY exist in the provided schema.\n"
            "2. Each question must be answerable using a single SQLite query against table 'orders'.\n"
            "3. Return ONLY a strict JSON array of objects with keys 'title', 'description', 'icon'."
        )

        user_prompt = f"Schema:\n{schema_text}\n\nGenerate 3 to 4 tailored business questions. Return strictly JSON array."

        try:
            raw_resp = self._call_llm(user_prompt, system_prompt)
            raw_resp = re.sub(r"<think>[\s\S]*?</think>", "", raw_resp, flags=re.IGNORECASE).strip()
            arr_match = re.search(r"\[\s*\{.*\}\s*\]", raw_resp, re.DOTALL)
            if arr_match:
                import json
                parsed = json.loads(arr_match.group(0))
                if isinstance(parsed, list) and len(parsed) >= 2:
                    valid = [
                        {"title": str(item["title"]).strip(), "description": str(item["description"]).strip(), "icon": str(item.get("icon", "📊")).strip()}
                        for item in parsed
                        if isinstance(item, dict) and item.get("title") and item.get("description")
                    ]
                    if len(valid) >= 3:
                        return valid[:4]
        except Exception:
            pass

        return self._generate_deterministic_questions(df)
