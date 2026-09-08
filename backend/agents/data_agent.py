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
        #
        # Strategy overview:
        #  Numeric cols that vary by category (e.g. unit_price):
        #    → Fill using the median WITHIN the same product category (high confidence)
        #    → Fall back to overall median if category is also unknown (low confidence)
        #  Category col that is tightly coupled to price (e.g. product):
        #    → Infer from price proximity to each category's median (high confidence)
        #    → Fall back to "Unknown" — never blind-mode-fill a specific product name
        #  All other numerics: overall median (standard)
        #  All other categoricals: mode if low-cardinality, else "Unknown"
        # =====================================================================
        columns_info: List[Dict[str, Any]] = []

        # Detect structural columns used for category-aware imputation
        cat_col_name: Optional[str] = next(
            (
                str(c)
                for c in df.columns
                if any(kw in str(c).lower() for kw in ["product", "category", "item"])
            ),
            None,
        )
        price_col_name: Optional[str] = next(
            (
                str(c)
                for c in df.columns
                if any(kw in str(c).lower() for kw in ["unit_price", "price"])
            ),
            None,
        )

        # Pre-compute per-category price medians for inference (only if both cols exist)
        cat_price_medians: Dict[str, float] = {}
        overall_price_median: Optional[float] = None
        if cat_col_name and price_col_name:
            price_num = pd.to_numeric(df[price_col_name], errors="coerce")
            overall_price_median = float(price_num.median()) if price_num.notna().any() else None
            cat_price_medians = (
                df.groupby(df[cat_col_name])[price_col_name]
                .apply(lambda s: pd.to_numeric(s, errors="coerce").median())
                .dropna()
                .to_dict()
            )
            # Cast keys to str for consistent lookup
            cat_price_medians = {str(k): float(v) for k, v in cat_price_medians.items()}

        # Pre-compute per-category medians for all numeric columns
        #   { col_str -> { category_value -> median } }
        cat_numeric_medians: Dict[str, Dict[str, float]] = {}
        if cat_col_name:
            for col in df.columns:
                col_str = str(col)
                if col_str == cat_col_name:
                    continue
                if pd.api.types.is_numeric_dtype(df[col]) or self._is_numeric_target_column(col_str, df[col]):
                    grp_medians = (
                        df.groupby(df[cat_col_name])[col]
                        .apply(lambda s: pd.to_numeric(s, errors="coerce").median())
                        .dropna()
                        .to_dict()
                    )
                    cat_numeric_medians[col_str] = {str(k): float(v) for k, v in grp_medians.items()}

        # ---- Pass 1: product/category column — infer from price if available ----
        if cat_col_name and cat_col_name in [str(c) for c in df.columns]:
            true_null_cat_indices = [
                idx
                for idx in range(rows_after_dedup)
                if pd.isna(df.at[idx, cat_col_name]) and (idx, cat_col_name) not in flagged_cells
            ]

            if true_null_cat_indices:
                imputed_cat_count = 0
                for idx in true_null_cat_indices:
                    # Try to infer product from unit_price proximity
                    inferred = None
                    confidence_tag = None
                    if price_col_name and cat_price_medians:
                        row_price = pd.to_numeric(df.at[idx, price_col_name], errors="coerce")
                        if pd.notna(row_price) and row_price > 0:
                            # Pick the category whose median price is closest
                            closest_cat = min(
                                cat_price_medians,
                                key=lambda c: abs(cat_price_medians[c] - float(row_price)),
                            )
                            inferred = closest_cat
                            confidence_tag = "high"
                            flagged_for_review.append(
                                {
                                    "row_index": int(idx) + 1,
                                    "column": cat_col_name,
                                    "original_value": None,
                                    "reason": (
                                        f"Missing '{cat_col_name}' inferred as '{closest_cat}' "
                                        f"from price similarity (row price ${float(row_price):,.2f} ~= "
                                        f"'{closest_cat}' median ${cat_price_medians[closest_cat]:,.2f}). "
                                        f"[imputation confidence: high — price-matched]"
                                    ),
                                }
                            )
                        else:
                            # Price also missing — fill as Unknown, do NOT mode-fill
                            inferred = "Unknown"
                            confidence_tag = "low"
                            flagged_for_review.append(
                                {
                                    "row_index": int(idx) + 1,
                                    "column": cat_col_name,
                                    "original_value": None,
                                    "reason": (
                                        f"Missing '{cat_col_name}' filled with 'Unknown' — "
                                        f"price also unavailable so product identity cannot be inferred. "
                                        f"[imputation confidence: low — category unknown]"
                                    ),
                                }
                            )
                    else:
                        inferred = "Unknown"
                        confidence_tag = "low"

                    df.at[idx, cat_col_name] = inferred
                    imputed_cat_count += 1

                auto_fixed_counts["missing_values_imputed"] += imputed_cat_count

                # Rebuild per-category medians after filling product so subsequent
                # numeric passes can use the newly assigned categories
                if cat_price_medians and price_col_name:
                    grp_update = (
                        df.groupby(df[cat_col_name])[price_col_name]
                        .apply(lambda s: pd.to_numeric(s, errors="coerce").median())
                        .dropna()
                        .to_dict()
                    )
                    cat_price_medians = {str(k): float(v) for k, v in grp_update.items()}
                    for col in df.columns:
                        col_str = str(col)
                        if col_str == cat_col_name:
                            continue
                        if pd.api.types.is_numeric_dtype(df[col]) or self._is_numeric_target_column(col_str, df[col]):
                            grp_medians = (
                                df.groupby(df[cat_col_name])[col]
                                .apply(lambda s: pd.to_numeric(s, errors="coerce").median())
                                .dropna()
                                .to_dict()
                            )
                            cat_numeric_medians[col_str] = {str(k): float(v) for k, v in grp_medians.items()}

        # ---- Pass 2: all other columns ----
        for col in df.columns:
            col_str = str(col)

            # Already handled above
            if col_str == cat_col_name:
                missing_count = initial_missing_stats[col_str]["missing_count"]
                missing_pct = initial_missing_stats[col_str]["missing_pct"]
                true_null_count = sum(
                    1 for idx in range(rows_after_dedup)
                    if pd.isna(df.at[idx, col_str]) and (idx, col_str) not in flagged_cells
                )
                strat = "price-proximity inference or 'Unknown' (no mode-fill)" if true_null_count == 0 else "none"
                columns_info.append(
                    {
                        "name": col_str,
                        "dtype": str(df[col].dtype),
                        "missing_pct": missing_pct,
                        "missing_count": missing_count,
                        "imputation_strategy": strat,
                    }
                )
                continue

            missing_count = initial_missing_stats[col_str]["missing_count"]
            missing_pct = initial_missing_stats[col_str]["missing_pct"]
            imputation_strategy = "none"

            # Eligible true null indices
            true_null_indices = [
                idx
                for idx in range(rows_after_dedup)
                if pd.isna(df.at[idx, col]) and (idx, col_str) not in flagged_cells
            ]

            if len(true_null_indices) > 0:
                is_num = pd.api.types.is_numeric_dtype(df[col]) or self._is_numeric_target_column(col_str, df[col])
                if is_num:
                    numeric_series = pd.to_numeric(df[col], errors="coerce")
                    overall_median = numeric_series.median()
                    valid_nums = numeric_series.dropna().replace([np.inf, -np.inf], np.nan).dropna()
                    is_integer_col = (
                        pd.api.types.is_integer_dtype(df[col])
                        or (len(valid_nums) > 0 and (valid_nums == valid_nums.round()).all())
                    )

                    per_cat_medians = cat_numeric_medians.get(col_str, {})

                    for idx in true_null_indices:
                        # Determine which category this row belongs to
                        row_cat: Optional[str] = None
                        if cat_col_name:
                            raw_cat = df.at[idx, cat_col_name]
                            if pd.notna(raw_cat) and str(raw_cat) != "Unknown":
                                row_cat = str(raw_cat)

                        if row_cat and row_cat in per_cat_medians:
                            # Category-aware fill (high confidence)
                            cat_med = per_cat_medians[row_cat]
                            fill_val = int(round(cat_med)) if is_integer_col else float(cat_med)
                            confidence = "high"
                            imputation_note = (
                                f"[imputation confidence: high — filled using '{row_cat}' category median "
                                f"${cat_med:,.2f}]"
                            )
                        else:
                            # Fallback to overall median (low confidence)
                            if pd.isna(overall_median):
                                fill_val = 0
                            elif is_integer_col:
                                fill_val = int(round(float(overall_median)))
                            else:
                                fill_val = float(overall_median)
                            confidence = "low"
                            imputation_note = (
                                f"[imputation confidence: low — category unknown, "
                                f"used overall column median ${float(overall_median):,.2f}]"
                            )

                        df.at[idx, col] = fill_val
                        flagged_for_review.append(
                            {
                                "row_index": int(idx) + 1,
                                "column": col_str,
                                "original_value": None,
                                "reason": (
                                    f"Missing value in '{col_str}' imputed with {fill_val}. "
                                    + imputation_note
                                ),
                            }
                        )

                    auto_fixed_counts["missing_values_imputed"] += len(true_null_indices)
                    has_cat = any(row_cat and row_cat in per_cat_medians for idx in true_null_indices
                                  for row_cat in [str(df.at[idx, cat_col_name]) if cat_col_name and pd.notna(df.at[idx, cat_col_name]) else None]
                                  if row_cat)
                    imputation_strategy = (
                        "category-median (high confidence)" if has_cat else "overall-median (low confidence — category unknown)"
                    )

                    # Cast column to clean numeric dtype
                    has_flagged = any((i, col_str) in flagged_cells for i in range(rows_after_dedup))
                    if not has_flagged:
                        if is_integer_col:
                            df[col] = pd.to_numeric(df[col], errors="coerce").round().astype("int64")
                        else:
                            df[col] = pd.to_numeric(df[col], errors="coerce").astype("float64")
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
                # No missing values — still try to cast unflagged numeric columns cleanly
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
