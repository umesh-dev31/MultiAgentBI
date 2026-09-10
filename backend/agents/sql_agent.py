import os
import re
import sqlite3
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
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

    def _filter_validated_subset(
        self, df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None
    ) -> pd.DataFrame:
        """Filters the DataFrame down to the validated subset using identical business rules
        to the EDA Agent (excludes negative quantities/prices, outliers > 3x IQR, and unparseable nulls).
        """
        if df is None or df.empty:
            return pd.DataFrame()

        data = df.copy().reset_index(drop=True)
        numeric_cols: List[str] = []

        for col in data.columns:
            num_series = pd.to_numeric(data[col], errors="coerce")
            valid_ratio = num_series.notna().sum() / len(data) if len(data) > 0 else 0
            if valid_ratio > 0.6:
                numeric_cols.append(col)
                data[col] = num_series

        excluded_indices = set()

        # 1. Flagged outliers from DataQualityReport
        if quality_report and "flagged_for_review" in quality_report:
            for item in quality_report["flagged_for_review"]:
                reason = str(item.get("reason", "")).lower()
                if "outlier" in reason:
                    r_idx = item.get("row_index")
                    if isinstance(r_idx, int) and (r_idx - 1) in data.index:
                        excluded_indices.add(r_idx - 1)

        # 2. Aggregated metric columns
        aggregated_metric_cols = [
            c for c in numeric_cols
            if any(kw in c.lower() for kw in ["qty", "quantity", "price", "unit_price", "amount", "revenue", "sales", "total", "cost", "fee"])
        ]
        if not aggregated_metric_cols:
            aggregated_metric_cols = [c for c in numeric_cols if not c.lower().endswith("_id")]

        # 3. Exclude negative values in non-negative metrics
        for col in aggregated_metric_cols:
            neg_mask = data[col] < 0
            for idx in data[neg_mask].index:
                excluded_indices.add(idx)

        # 4. Exclude extreme statistical outliers (> 3x IQR from median)
        for col in aggregated_metric_cols:
            clean_s = data[col].dropna()
            if len(clean_s) >= 4:
                q25 = clean_s.quantile(0.25)
                q75 = clean_s.quantile(0.75)
                iqr = q75 - q25
                med = clean_s.median()
                if iqr > 0:
                    lower_lim = med - 3.0 * iqr
                    upper_lim = med + 3.0 * iqr
                    outlier_mask = (clean_s < lower_lim) | (clean_s > upper_lim)
                    for idx in clean_s[outlier_mask].index:
                        excluded_indices.add(idx)

        # 5. Exclude null values in aggregated metric columns
        for col in aggregated_metric_cols:
            null_mask = data[col].isna()
            for idx in data[null_mask].index:
                excluded_indices.add(idx)

        validated_mask = ~data.index.isin(excluded_indices)
        return data[validated_mask].copy().reset_index(drop=True)

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
        """Removes markdown code fences, comments, and trailing whitespace from LLM output."""
        text = raw_output.strip()
        # Extract content inside ```sql ... ``` or ``` ... ```
        match = re.search(r"```(?:sql)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if match:
            text = match.group(1).strip()
        # Remove any single-line comments (-- ...)
        lines = []
        for line in text.splitlines():
            clean_l = re.sub(r"--.*$", "", line).strip()
            if clean_l:
                lines.append(clean_l)
        cleaned = " ".join(lines).strip()
        # Ensure trailing semicolon is cleaned or retained
        return cleaned.rstrip(";")

    def _validate_sql_safety(self, sql: str) -> Tuple[bool, Optional[str]]:
        """Validates that the SQL is strictly a SELECT statement and does not include
        forbidden modification or administrative statements.
        """
        if not sql:
            return False, "Generated SQL is empty."

        # Tokenize words for keyword checking
        tokens = set(re.findall(r"\b[A-Za-z_]+\b", sql.upper()))

        for kw in self.FORBIDDEN_KEYWORDS:
            if kw in tokens:
                return False, f"Safety violation: Forbidden SQL keyword '{kw}' detected. Only SELECT queries are permitted."

        # Must begin with SELECT or WITH
        trimmed = sql.strip().upper()
        if not (trimmed.startswith("SELECT") or trimmed.startswith("WITH")):
            return False, "Safety violation: Only SELECT (or CTE WITH ... SELECT) queries are allowed."

        # Multiple statements separated by semicolon are dangerous
        statements = [s.strip() for s in sql.split(";") if s.strip()]
        if len(statements) > 1:
            return False, "Safety violation: Multiple SQL statements detected."

        return True, None

    def _call_llm(self, prompt: str, system_prompt: str) -> str:
        """Calls the configured LLM (Anthropic if key exists, Groq if key exists, or fallback)."""
        # 1. Try Anthropic if ANTHROPIC_API_KEY is available
        if self.anthropic_api_key and not self.anthropic_api_key.startswith("your_"):
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=self.anthropic_api_key)
                response = client.messages.create(
                    model=self.anthropic_model,
                    max_tokens=600,
                    system=system_prompt,
                    messages=[{"role": "user", "content": prompt}],
                )
                if response.content and len(response.content) > 0:
                    first_block = response.content[0]
                    text_val = getattr(first_block, "text", None)
                    if text_val is not None:
                        return str(text_val)
            except Exception as e:
                # If Anthropic fails, fall through to Groq or raise
                if not self.groq_api_key:
                    raise RuntimeError(f"Anthropic API error: {str(e)}")

        # 2. Try Groq if GROQ_API_KEY is available
        if self.groq_api_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.groq_api_key)
                response = client.chat.completions.create(
                    model=self.groq_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.0,
                    max_tokens=600,
                )
                if response.choices and len(response.choices) > 0:
                    return response.choices[0].message.content or ""
            except Exception as e:
                # If model not found or groq error, try fallback model
                try:
                    from groq import Groq
                    client = Groq(api_key=self.groq_api_key)
                    response = client.chat.completions.create(
                        model="qwen/qwen3.8-27b",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        temperature=0.0,
                        max_tokens=600,
                    )
                    if response.choices and len(response.choices) > 0:
                        return response.choices[0].message.content or ""
                except Exception:
                    raise RuntimeError(f"Groq API error: {str(e)}")

        raise RuntimeError("No valid LLM API key configured (ANTHROPIC_API_KEY or GROQ_API_KEY).")

    def _execute_sql(
        self, conn: sqlite3.Connection, sql: str
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """Executes the query on the SQLite connection and returns records and error."""
        try:
            cursor = conn.cursor()
            cursor.execute(sql)
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            records = []
            for row in rows:
                record = {}
                for col_name, val in zip(columns, row):
                    # Format floats nicely if needed
                    if isinstance(val, float):
                        record[col_name] = round(val, 2)
                    else:
                        record[col_name] = val
                records.append(record)
            return records, None
        except Exception as e:
            return [], str(e)

    def generate_and_run(
        self,
        question: str,
        df: pd.DataFrame,
        quality_report: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Translates a natural language question into SQL, runs it against the validated
        in-memory database, retries once if SQL execution fails, and returns structured results.

        Args:
            question: Business question in natural language.
            df: Cleaned pandas DataFrame.
            quality_report: Optional DataQualityReport from DataAgent.

        Returns:
            Dict with question, generated_sql, result, row_count, error.
        """
        if df is None or df.empty:
            return {
                "question": question,
                "generated_sql": "",
                "result": [],
                "row_count": 0,
                "error": "Dataset is empty or has not been uploaded yet.",
            }

        if not question or not question.strip():
            return {
                "question": "",
                "generated_sql": "",
                "result": [],
                "row_count": 0,
                "error": "Question cannot be empty.",
            }

        # 1. Filter dataset to validated subset (identical to EDA Agent)
        validated_df = self._filter_validated_subset(df, quality_report=quality_report)
        if validated_df.empty:
            return {
                "question": question,
                "generated_sql": "",
                "result": [],
                "row_count": 0,
                "error": "No valid rows available after outlier and business rule filtering.",
            }

        # 2. In-memory SQLite database setup
        conn = sqlite3.connect(":memory:")
        try:
            # Write validated data to table 'orders'
            validated_df.to_sql("orders", conn, if_exists="replace", index=False)

            schema_str = self._extract_schema(validated_df)

            system_prompt = (
                "You are an expert SQLite data analyst and SQL generator. "
                "Your task is to generate a single, valid SQLite SELECT query that directly answers the user question. "
                "CRITICAL RULES:\n"
                "1. Generate ONLY the raw SQL query. No markdown fences, no explanatory text, no comments.\n"
                "2. The table is named 'orders'.\n"
                "3. Use standard SQLite syntax and functions (e.g. SUM, AVG, COUNT, ROUND, strftime for dates).\n"
                "4. Only SELECT queries are permitted.\n"
                "5. Ensure column names in your query match the schema exactly."
            )

            user_prompt = (
                f"Schema:\n{schema_str}\n\n"
                f"Question: {question.strip()}\n\n"
                "Generate the SQLite SELECT query:"
            )

            # 3. Call LLM for initial SQL query
            try:
                raw_sql = self._call_llm(user_prompt, system_prompt)
            except Exception as llm_err:
                return {
                    "question": question,
                    "generated_sql": "",
                    "result": [],
                    "row_count": 0,
                    "error": f"LLM generation failed: {str(llm_err)}",
                }

            sql = self._clean_sql(raw_sql)

            # 4. Validate SQL Safety
            is_safe, safety_error = self._validate_sql_safety(sql)
            if not is_safe:
                return {
                    "question": question,
                    "generated_sql": sql,
                    "result": [],
                    "row_count": 0,
                    "error": safety_error,
                }

            # 5. Execute query on in-memory SQLite table
            records, exec_error = self._execute_sql(conn, sql)

            # 6. Retry once if execution failed (bad SQL syntax, column mismatch, etc.)
            if exec_error is not None:
                retry_prompt = (
                    f"Schema:\n{schema_str}\n\n"
                    f"Question: {question.strip()}\n\n"
                    f"Your previous query was:\n{sql}\n\n"
                    f"It failed to execute with this SQLite error:\n{exec_error}\n\n"
                    "Please fix the SQL query to resolve this error. "
                    "Output ONLY the corrected valid SQLite SELECT query, nothing else."
                )

                try:
                    retry_raw_sql = self._call_llm(retry_prompt, system_prompt)
                    retry_sql = self._clean_sql(retry_raw_sql)
                    is_safe_retry, safety_err_retry = self._validate_sql_safety(retry_sql)
                    if not is_safe_retry:
                        return {
                            "question": question,
                            "generated_sql": retry_sql,
                            "result": [],
                            "row_count": 0,
                            "error": safety_err_retry,
                        }

                    records_retry, exec_error_retry = self._execute_sql(conn, retry_sql)
                    if exec_error_retry is None:
                        return {
                            "question": question,
                            "generated_sql": retry_sql,
                            "result": records_retry,
                            "row_count": len(records_retry),
                            "error": None,
                        }
                    else:
                        # Failed twice: return clean error message instead of crashing
                        return {
                            "question": question,
                            "generated_sql": retry_sql,
                            "result": [],
                            "row_count": 0,
                            "error": f"Query execution failed after retry: {exec_error_retry}",
                        }
                except Exception as retry_err:
                    return {
                        "question": question,
                        "generated_sql": sql,
                        "result": [],
                        "row_count": 0,
                        "error": f"Query failed: {exec_error}. Retry attempt error: {str(retry_err)}",
                    }

            # First attempt succeeded
            return {
                "question": question,
                "generated_sql": sql,
                "result": records,
                "row_count": len(records),
                "error": None,
            }
        finally:
            conn.close()

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

