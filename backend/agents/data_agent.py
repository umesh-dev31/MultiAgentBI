import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
import pandas as pd


class DataAgent:
    """Standalone agent responsible for data ingestion, validation, safe auto-fixing,
    flagging suspicious issues, and intelligent imputation.
    """

    def __init__(self):
        self.last_cleaned_df: Optional[pd.DataFrame] = None

    @staticmethod
    def _is_high_cardinality_or_identifier(series: pd.Series, col_name: str) -> bool:
        """Determines whether a categorical/text column behaves like unique identifiers or names
        (high cardinality relative to row count) rather than clear repeating categories.
        """
        non_nulls = series.dropna()
        valid_count = int(len(non_nulls))
        if valid_count == 0:
            return True

        # Evaluate case-insensitively for string series to properly identify dirty categories (e.g. 'north', 'NORTH')
        lower_series = non_nulls.astype(str).str.strip().str.lower()
        nunique = int(lower_series.nunique())
        cardinality_ratio = nunique / valid_count

        val_counts = lower_series.value_counts()
        max_frequency = int(val_counts.iloc[0]) if not val_counts.empty else 0

        # If no non-null value repeats at all even case-insensitively, there is no repeating category
        if max_frequency <= 1:
            return True

        col_lower = str(col_name).lower()
        identifier_keywords = [
            "name",
            "id",
            "code",
            "email",
            "uuid",
            "guid",
            "key",
            "token",
            "ssn",
            "phone",
            "customer",
            "user",
        ]
        has_identifier_keyword = any(kw in col_lower for kw in identifier_keywords)

        # Identifier/name-like columns with moderate-to-high cardinality (>40% unique)
        if has_identifier_keyword and cardinality_ratio > 0.4:
            return True

        # General high cardinality: >60% unique when there are more than 10 rows
        if valid_count > 10 and cardinality_ratio > 0.6:
            return True

        # Very high uniqueness in any dataset (>= 85% unique entries)
        if cardinality_ratio >= 0.85:
            return True

        return False

    @staticmethod
    def _parse_flexible_date(val_str: str) -> pd.Timestamp:
        """Parses date strings enforcing day-first interpretation (dayfirst=True)
        for ambiguous numeric date formats (e.g. DD/MM/YYYY, DD-MM-YYYY),
        while preserving ISO format (YYYY-MM-DD).
        """
        s = val_str.strip()
        # ISO formats starting with 4-digit year (e.g. YYYY-MM-DD or YYYY/MM/DD)
        if re.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}", s):
            return pd.to_datetime(s, format="mixed", dayfirst=False, errors="raise")
        else:
            # Enforce day-first interpretation for regional formats (DD/MM/YYYY, DD-MM-YYYY)
            return pd.to_datetime(s, format="mixed", dayfirst=True, errors="raise")

    @staticmethod
    def _is_date_column(col_name: str, series: pd.Series) -> bool:
        """Checks if a column represents a date or timestamp."""
        col_lower = str(col_name).lower()
        # Never treat numeric identifiers or metrics as dates
        if any(kw in col_lower for kw in ["id", "price", "salary", "amount", "qty", "quantity", "cost", "revenue", "sales", "balance"]):
            return False

        date_keywords = ["order_date", "date", "timestamp", "created_at", "updated_at", "datetime"]
        if any(kw in col_lower for kw in date_keywords):
            return True

        if pd.api.types.is_numeric_dtype(series):
            return False

        non_nulls = series.dropna()
        if len(non_nulls) == 0:
            return False

        date_pattern = re.compile(
            r"(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4})|([a-zA-Z]{3,}\s+\d{1,2})",
            re.IGNORECASE,
        )
        sample = non_nulls.head(5).astype(str).tolist()
        matched = [s for s in sample if date_pattern.search(s)]
        return len(matched) >= max(1, len(sample) // 2)

    @staticmethod
    def _is_numeric_target_column(col_name: str, series: pd.Series) -> bool:
        """Determines if a column is numeric or should be treated as numeric."""
        if pd.api.types.is_numeric_dtype(series):
            return True

        col_lower = str(col_name).lower()
        numeric_keywords = [
            "quantity",
            "qty",
            "price",
            "unit_price",
            "amount",
            "salary",
            "cost",
            "revenue",
            "sales",
            "total",
            "discount",
            "rating",
            "score",
            "experience",
            "age",
            "count",
            "balance",
            "fee",
            "id",
        ]
        if any(kw in col_lower for kw in numeric_keywords):
            return True

        non_nulls = series.dropna()
        if len(non_nulls) == 0:
            return False

        sample = non_nulls.head(5).astype(str).tolist()
        num_pattern = re.compile(r"^[\$€£¥\s]*-?\s*[\d,]+(\.\d+)?[\s%]?$")
        matched = sum(1 for s in sample if num_pattern.match(s.strip()))
        return matched >= max(1, len(sample) // 2)

    @staticmethod
    def _is_non_negative_column(col_name: str) -> bool:
        """Identifies columns that logically must be non-negative."""
        col_lower = str(col_name).lower()
        non_negative_keywords = [
            "quantity",
            "qty",
            "price",
            "unit_price",
            "amount",
            "salary",
            "cost",
            "revenue",
            "sales",
            "total",
            "count",
            "age",
            "experience",
        ]
        return any(kw in col_lower for kw in non_negative_keywords)

    def process(self, file_path: str) -> Dict[str, Any]:
        """Loads a dataset (CSV or Excel), applies safe auto-fixes, flags data quality
        issues for human review, and performs intelligent missing-value imputation.

        Args:
            file_path: Path to the target data file (.csv, .xlsx, or .xls).

        Returns:
            Dict containing summary metrics, shape, columns, cleaned preview,
            and the comprehensive data_quality_report.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        _, ext = os.path.splitext(file_path.lower())
        if ext == ".csv":
            df = pd.read_csv(file_path)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}. Only .csv and .xlsx/.xls files are supported.")

        # Ensure clean integer 0..N index
        df = df.reset_index(drop=True)

        # Ensure object dtype so numeric, string, and null assignments do not trigger StringDtype TypeErrors
        df = df.astype(object)

        original_rows = int(len(df))
        original_cols = int(len(df.columns))

        # Track quality report stats
        auto_fixed_counts = {
            "whitespace_trimmed": 0,
            "casing_normalized": 0,
            "currency_or_thousands_parsed": 0,
            "null_literals_converted": 0,
            "duplicate_rows_dropped": 0,
            "missing_values_imputed": 0,
        }
        flagged_for_review: List[Dict[str, Any]] = []

        # Track cells that contain flagged/unparseable values so imputation does not overwrite them
        flagged_cells: Set[Tuple[int, str]] = set()

        # =====================================================================
        # 1. SAFE AUTO-FIX: Remove exact duplicate rows
        # =====================================================================
        duplicate_count = int(df.duplicated().sum())
        if duplicate_count > 0:
            df = df.drop_duplicates().reset_index(drop=True)
            auto_fixed_counts["duplicate_rows_dropped"] = duplicate_count

        rows_after_dedup = int(len(df))

        # =====================================================================
        # 2. SAFE AUTO-FIX: Strip whitespace & convert literal null strings
        # =====================================================================
        null_literal_set = {"nan", "n/a", "none", "null", ""}

        for col in df.columns:
            for idx in range(rows_after_dedup):
                val = df.at[idx, col]
                if isinstance(val, str):
                    stripped = val.strip()
                    if len(stripped) != len(val):
                        auto_fixed_counts["whitespace_trimmed"] += 1
                        val = stripped
                        df.at[idx, col] = val

                    # Check for literal null strings
                    if val.lower() in null_literal_set:
                        df.at[idx, col] = np.nan
                        auto_fixed_counts["null_literals_converted"] += 1

        # Record initial missing stats per column right after standardizing nulls
        initial_missing_stats: Dict[str, Dict[str, Any]] = {}
        for col in df.columns:
            col_str = str(col)
            miss_cnt = int(df[col].isna().sum())
            miss_pct = (
                round(float((miss_cnt / rows_after_dedup) * 100), 2)
                if rows_after_dedup > 0
                else 0.0
            )
            initial_missing_stats[col_str] = {
                "missing_count": miss_cnt,
                "missing_pct": miss_pct,
            }

        # =====================================================================
        # 3. SAFE AUTO-FIX: Normalize casing for low-cardinality categorical columns
        # (Exclude customer_name, city, and high-cardinality/identifier columns)
        # =====================================================================
        for col in df.columns:
            col_str = str(col)
            col_lower = col_str.lower()

            # Check exclusions: customer_name, city, names, high-cardinality identifiers
            is_casing_excluded = (
                col_lower in ["customer_name", "city", "name", "email", "address"]
                or col_lower.endswith("_name")
                or self._is_high_cardinality_or_identifier(df[col], col_str)
                or self._is_date_column(col_str, df[col])
                or self._is_numeric_target_column(col_str, df[col])
            )

            if not is_casing_excluded:
                for idx in range(rows_after_dedup):
                    val = df.at[idx, col]
                    if isinstance(val, str) and pd.notna(val):
                        titled = val.title()
                        if titled != val:
                            df.at[idx, col] = titled
                            auto_fixed_counts["casing_normalized"] += 1

        # =====================================================================
        # 4. DATE PARSING & FLAGGING (order_date and date-like columns)
        # =====================================================================
        for col in df.columns:
            col_str = str(col)
            if self._is_date_column(col_str, df[col]):
                for idx in range(rows_after_dedup):
                    val = df.at[idx, col]
                    if pd.notna(val):
                        val_str = str(val).strip()
                        try:
                            parsed_dt = self._parse_flexible_date(val_str)
                            df.at[idx, col] = parsed_dt.strftime("%Y-%m-%d")
                        except Exception:
                            # Flag unparseable or impossible calendar dates (e.g. Feb 30, Month 13)
                            df.at[idx, col] = np.nan
                            flagged_cells.add((idx, col_str))
                            flagged_for_review.append(
                                {
                                    "row_index": idx + 1,
                                    "column": col_str,
                                    "original_value": val,
                                    "reason": f"Unparseable or impossible calendar date '{val}'",
                                }
                            )

        # =====================================================================
        # 5. NUMERIC CLEANING & NON-NUMERIC TEXT FLAGGING
        # =====================================================================
        for col in df.columns:
            col_str = str(col)
            if self._is_numeric_target_column(col_str, df[col]):
                for idx in range(rows_after_dedup):
                    val = df.at[idx, col]
                    if pd.notna(val) and isinstance(val, str):
                        cleaned_str = re.sub(r"[\$€£¥\s]", "", val).replace(",", "")
                        # Detect infinite literals
                        if cleaned_str.lower() in ["infinity", "-infinity", "+infinity", "inf", "-inf"]:
                            df.at[idx, col] = np.nan
                            flagged_cells.add((idx, col_str))
                            flagged_for_review.append(
                                {
                                    "row_index": idx + 1,
                                    "column": col_str,
                                    "original_value": val,
                                    "reason": f"Non-numeric text '{val}' in numeric column",
                                }
                            )
                        else:
                            try:
                                parsed_num = float(cleaned_str)
                                df.at[idx, col] = parsed_num
                                if cleaned_str != val:
                                    auto_fixed_counts["currency_or_thousands_parsed"] += 1
                            except ValueError:
                                # Non-numeric text that can't be safely parsed (e.g. 'six', '15O00')
                                df.at[idx, col] = np.nan
                                flagged_cells.add((idx, col_str))
                                flagged_for_review.append(
                                    {
                                        "row_index": idx + 1,
                                        "column": col_str,
                                        "original_value": val,
                                        "reason": f"Non-numeric text '{val}' in numeric column",
                                    }
                                )

        # =====================================================================
        # 6. FLAGGED ISSUES: Negative values & Statistical outliers
        # =====================================================================
        for col in df.columns:
            col_str = str(col)
            col_lower = col_str.lower()

            # Negative and zero values in columns that must be strictly positive
            if self._is_non_negative_column(col_str):
                numeric_s = pd.to_numeric(df[col], errors="coerce")
                for idx, val in numeric_s.items():
                    if pd.notna(val) and val < 0:
                        flagged_for_review.append(
                            {
                                "row_index": int(idx) + 1,
                                "column": col_str,
                                "original_value": val,
                                "reason": f"Negative value ({val}) in column that should be non-negative",
                            }
                        )
                    elif pd.notna(val) and val == 0:
                        # A valid order cannot have 0 quantity or 0 unit_price
                        flagged_for_review.append(
                            {
                                "row_index": int(idx) + 1,
                                "column": col_str,
                                "original_value": val,
                                "reason": f"Zero value in '{col_str}' — business-invalid (a valid order requires quantity > 0 and unit_price > 0)",
                            }
                        )

            # Statistical outliers in quantity/unit_price (beyond 3x IQR from median)
            if any(tok in col_lower for tok in ["quantity", "qty", "unit_price", "price"]):
                numeric_s = pd.to_numeric(df[col], errors="coerce").dropna()
                if len(numeric_s) >= 4:
                    q25 = float(numeric_s.quantile(0.25))
                    q75 = float(numeric_s.quantile(0.75))
                    iqr = q75 - q25
                    median_val = float(numeric_s.median())
                    if iqr > 0:
                        lower_bound = median_val - 3.0 * iqr
                        upper_bound = median_val + 3.0 * iqr
                        for idx, val in numeric_s.items():
                            if val < lower_bound or val > upper_bound:
                                flagged_for_review.append(
                                    {
                                        "row_index": int(idx) + 1,
                                        "column": col_str,
                                        "original_value": val,
                                        "reason": "possible outlier, review before including in analysis",
                                    }
                                )

        # =====================================================================
        # 7. MISSING VALUE IMPUTATION (ONLY ON TRUE NULLS, NOT FLAGGED CELLS)
        # =====================================================================
        columns_info: List[Dict[str, Any]] = []

        for col in df.columns:
            col_str = str(col)
            missing_count = initial_missing_stats[col_str]["missing_count"]
            missing_pct = initial_missing_stats[col_str]["missing_pct"]

            imputation_strategy = "none"

            # Eligible true null indices are null cells NOT in flagged_cells
            true_null_indices = [
                idx
                for idx in range(rows_after_dedup)
                if pd.isna(df.at[idx, col]) and (idx, col_str) not in flagged_cells
            ]

            if len(true_null_indices) > 0:
                is_num = pd.api.types.is_numeric_dtype(df[col]) or self._is_numeric_target_column(col_str, df[col])
                if is_num:
                    numeric_series = pd.to_numeric(df[col], errors="coerce")
                    median_val = numeric_series.median()
                    valid_nums = numeric_series.dropna().replace([np.inf, -np.inf], np.nan).dropna()
                    is_integer_col = (
                        pd.api.types.is_integer_dtype(df[col])
                        or (len(valid_nums) > 0 and (valid_nums == valid_nums.round()).all())
                    )

                    if pd.isna(median_val):
                        fill_val = 0
                    elif is_integer_col:
                        fill_val = int(round(median_val))
                    else:
                        fill_val = float(median_val)

                    for idx in true_null_indices:
                        df.at[idx, col] = fill_val

                    auto_fixed_counts["missing_values_imputed"] += len(true_null_indices)
                    imputation_strategy = "median"

                    # Convert column to clean numeric or int if all values are non-null and not flagged
                    has_flagged = any((i, col_str) in flagged_cells for i in range(rows_after_dedup))
                    if not has_flagged:
                        if is_integer_col:
                            df[col] = df[col].astype("int64")
                        else:
                            df[col] = df[col].astype("float64")
                else:
                    # Categorical / string imputation
                    if self._is_high_cardinality_or_identifier(df[col], col_str):
                        fill_val = "Unknown"
                        imputation_strategy = "constant ('Unknown')"
                    else:
                        mode_series = df[col].mode(dropna=True)
                        fill_val = mode_series.iloc[0] if not mode_series.empty else "Unknown"
                        imputation_strategy = "mode"

                    for idx in true_null_indices:
                        df.at[idx, col] = fill_val

                    auto_fixed_counts["missing_values_imputed"] += len(true_null_indices)
            else:
                # Still check if we can cleanly cast unflagged numeric columns to int64/float64
                if pd.api.types.is_numeric_dtype(df[col]) or self._is_numeric_target_column(col_str, df[col]):
                    has_flagged = any((i, col_str) in flagged_cells for i in range(rows_after_dedup))
                    if not has_flagged and df[col].notna().all():
                        valid_nums = pd.to_numeric(df[col], errors="coerce")
                        if (valid_nums == valid_nums.round()).all():
                            df[col] = valid_nums.astype("int64")
                        else:
                            df[col] = valid_nums.astype("float64")

            columns_info.append(
                {
                    "name": col_str,
                    "dtype": str(df[col].dtype),
                    "missing_pct": missing_pct,
                    "missing_count": missing_count,
                    "imputation_strategy": imputation_strategy,
                }
            )

        cleaned_rows = int(len(df))
        cleaned_cols = int(len(df.columns))

        # =====================================================================
        # 8. PREPARE FIRST 10 ROWS PREVIEW
        # =====================================================================
        preview_df = df.head(10).replace([np.inf, -np.inf], None)
        cleaned_preview = preview_df.to_dict(orient="records")

        clean_preview_records: List[Dict[str, Any]] = []
        for row in cleaned_preview:
            cleaned_row = {}
            for k, v in row.items():
                if pd.isna(v):
                    cleaned_row[str(k)] = None
                elif isinstance(v, (np.integer,)):
                    cleaned_row[str(k)] = int(v)
                elif isinstance(v, (np.floating,)):
                    cleaned_row[str(k)] = float(v)
                elif isinstance(v, (np.bool_,)):
                    cleaned_row[str(k)] = bool(v)
                elif hasattr(v, "isoformat"):
                    cleaned_row[str(k)] = v.isoformat()
                else:
                    cleaned_row[str(k)] = v
            clean_preview_records.append(cleaned_row)

        # Cache cleaned dataframe for session/EDA consumption
        self.last_cleaned_df = df.copy()

        return {
            "summary": {
                "original_rows": original_rows,
                "cleaned_rows": cleaned_rows,
                "columns_count": cleaned_cols,
                "duplicate_rows_dropped": duplicate_count,
                "total_missing_values_filled": auto_fixed_counts["missing_values_imputed"],
            },
            "shape": [cleaned_rows, cleaned_cols],
            "columns": columns_info,
            "cleaned_preview": clean_preview_records,
            "data_quality_report": {
                "auto_fixed": auto_fixed_counts,
                "flagged_for_review": flagged_for_review,
            },
        }
