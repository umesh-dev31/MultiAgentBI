import re
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


class EDAAgent:
    """Standalone agent responsible for Exploratory Data Analysis (EDA) on cleaned datasets.
    Computes summary statistics, categorical distributions, correlation matrices,
    temporal trends, and deterministic notable patterns.
    """

    def analyze(self, df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Performs comprehensive exploratory analysis on a cleaned DataFrame using
        a validated subset that excludes business-invalid negatives, statistical outliers,
        and unparseable nulls.

        Args:
            df: Cleaned pandas DataFrame.
            quality_report: Optional DataQualityReport dictionary from DataAgent.

        Returns:
            Dict containing stats_computed_on, numeric_summary, categorical_summary,
            correlation_matrix, monthly_trend, and notable_patterns.
        """
        if df is None or df.empty:
            return {
                "stats_computed_on": {
                    "total_rows": 0,
                    "validated_rows_used": 0,
                    "excluded_rows": 0,
                },
                "numeric_summary": {},
                "categorical_summary": {},
                "correlation_matrix": {"columns": [], "matrix": []},
                "monthly_trend": [],
                "notable_patterns": ["Dataset is empty."],
            }

        # Work on a copy to avoid mutating original DataFrame
        data = df.copy().reset_index(drop=True)
        total_rows = int(len(data))

        # Identify numeric, date, and categorical columns
        numeric_cols: List[str] = []
        date_cols: List[str] = []
        categorical_cols: List[str] = []

        for col in data.columns:
            col_str = str(col)
            col_lower = col_str.lower()

            # Date column detection
            if any(kw in col_lower for kw in ["order_date", "date", "timestamp", "created_at"]):
                date_cols.append(col_str)
                continue

            # Check if numeric
            num_series = pd.to_numeric(data[col], errors="coerce")
            valid_ratio = num_series.notna().sum() / len(data) if len(data) > 0 else 0
            if valid_ratio > 0.6:
                numeric_cols.append(col_str)
                data[col] = num_series
            else:
                categorical_cols.append(col_str)

        # =====================================================================
        # VALIDATED SUBSET FILTERING
        # Exclude rows where:
        # - quantity or unit_price is negative (business-invalid)
        # - flagged as statistical outliers in quality report (or exceeding 3x IQR)
        # - null values in the columns being aggregated
        # =====================================================================
        excluded_indices = set()

        # 1. Outliers from DataQualityReport
        if quality_report and "flagged_for_review" in quality_report:
            for item in quality_report["flagged_for_review"]:
                reason = str(item.get("reason", "")).lower()
                if "outlier" in reason:
                    r_idx = item.get("row_index")
                    # row_index is 1-indexed
                    if isinstance(r_idx, int) and (r_idx - 1) in data.index:
                        excluded_indices.add(r_idx - 1)

        # Columns that represent quantities, prices, and amounts being aggregated
        aggregated_metric_cols = [
            c for c in numeric_cols
            if any(kw in c.lower() for kw in ["qty", "quantity", "price", "unit_price", "amount", "revenue", "sales", "total", "cost", "fee"])
        ]
        # Fallback to all numeric columns if no specific metric keywords match
        if not aggregated_metric_cols:
            aggregated_metric_cols = [c for c in numeric_cols if not c.lower().endswith("_id")]

        # 2. Exclude negative values in non-negative business columns
        for col in aggregated_metric_cols:
            neg_mask = data[col] < 0
            for idx in data[neg_mask].index:
                excluded_indices.add(idx)

        # 3. Detect extreme statistical outliers directly (e.g. 3x IQR from median)
        for col in aggregated_metric_cols:
            clean_s = data[col].dropna()
            if len(clean_s) >= 4:
                q25 = float(clean_s.quantile(0.25))
                q75 = float(clean_s.quantile(0.75))
                iqr = q75 - q25
                med = float(clean_s.median())
                if iqr > 0:
                    lower_lim = med - 3.0 * iqr
                    upper_lim = med + 3.0 * iqr
                    outlier_mask = (clean_s < lower_lim) | (clean_s > upper_lim)
                    for idx in clean_s[outlier_mask].index:
                        excluded_indices.add(idx)

        # 4. Exclude null values in aggregated columns (prevent silent conversion to 0)
        for col in aggregated_metric_cols:
            null_mask = data[col].isna()
            for idx in data[null_mask].index:
                excluded_indices.add(idx)

        # Construct validated dataset for statistics
        validated_mask = ~data.index.isin(excluded_indices)
        validated_df = data[validated_mask].copy()

        validated_rows_used = int(len(validated_df))
        excluded_rows_count = total_rows - validated_rows_used

        stats_computed_on = {
            "total_rows": total_rows,
            "validated_rows_used": validated_rows_used,
            "excluded_rows": excluded_rows_count,
        }

        # =====================================================================
        # 1. NUMERIC SUMMARY (Computed on validated subset)
        # =====================================================================
        numeric_summary: Dict[str, Dict[str, Any]] = {}
        for col in numeric_cols:
            s = pd.to_numeric(validated_df[col], errors="coerce").dropna()
            if len(s) == 0:
                continue

            mean_val = float(s.mean())
            std_val = float(s.std()) if len(s) > 1 else 0.0
            median_val = float(s.median())
            min_val = float(s.min())
            max_val = float(s.max())
            q25 = float(s.quantile(0.25))
            q50 = median_val
            q75 = float(s.quantile(0.75))

            is_int_like = (s == s.round()).all()

            numeric_summary[col] = {
                "count": int(len(s)),
                "mean": round(mean_val, 2),
                "std": round(std_val, 2) if not np.isnan(std_val) else 0.0,
                "median": int(median_val) if is_int_like else round(median_val, 2),
                "min": int(min_val) if is_int_like else round(min_val, 2),
                "max": int(max_val) if is_int_like else round(max_val, 2),
                "q25": round(q25, 2),
                "q50": round(q50, 2),
                "q75": round(q75, 2),
            }

        # =====================================================================
        # 2. CATEGORICAL SUMMARY (Top 5 values with counts & percentages)
        # =====================================================================
        categorical_summary: Dict[str, List[Dict[str, Any]]] = {}
        for col in categorical_cols:
            s = data[col].dropna().astype(str).str.strip()
            # Ignore purely empty strings
            s = s[s != ""]
            if len(s) == 0:
                continue

            total_valid = len(s)
            val_counts = s.value_counts().head(5)

            top_values = []
            for val, count in val_counts.items():
                pct = round(float((count / total_valid) * 100), 1)
                top_values.append({
                    "value": str(val),
                    "count": int(count),
                    "percentage": pct,
                })
            categorical_summary[col] = top_values

        # =====================================================================
        # 3. CORRELATION MATRIX (Pearson correlation on validated subset)
        # =====================================================================
        correlation_matrix: Dict[str, Any] = {"columns": [], "matrix": []}
        if len(numeric_cols) >= 2:
            num_df = validated_df[numeric_cols].dropna()
            if len(num_df) >= 2:
                corr_df = num_df.corr(method="pearson").fillna(0.0)
                corr_cols = list(corr_df.columns)
                matrix_rows = []
                for c1 in corr_cols:
                    row_vals = []
                    for c2 in corr_cols:
                        val = float(corr_df.loc[c1, c2])
                        row_vals.append(round(val, 3))
                    matrix_rows.append(row_vals)

                correlation_matrix = {
                    "columns": corr_cols,
                    "matrix": matrix_rows,
                }

        # =====================================================================
        # 4. SIMPLE TREND DETECTION (Group by month on validated subset)
        # =====================================================================
        monthly_trend: List[Dict[str, Any]] = []
        if len(date_cols) > 0:
            date_col = date_cols[0]
            # Convert date column to datetime on validated_df
            dt_series = pd.to_datetime(validated_df[date_col], format="mixed", errors="coerce")

            # Determine revenue/metric column
            qty_col = next((c for c in numeric_cols if any(k in c.lower() for k in ["qty", "quantity"])), None)
            price_col = next((c for c in numeric_cols if any(k in c.lower() for k in ["price", "unit_price"])), None)
            amount_col = next((c for c in numeric_cols if any(k in c.lower() for k in ["revenue", "amount", "sales", "total"])), None)

            trend_df = validated_df.copy()
            trend_df["_dt"] = dt_series
            # Exclude rows where date is missing or unparseable
            trend_df = trend_df[trend_df["_dt"].notna()].copy()

            if not trend_df.empty:
                trend_df["_month"] = trend_df["_dt"].dt.strftime("%Y-%m")

                # Compute computed revenue if both unit_price and quantity exist
                # Exclude null values in aggregated columns so they don't silently become 0
                if qty_col and price_col:
                    trend_df = trend_df[trend_df[qty_col].notna() & trend_df[price_col].notna()].copy()
                    trend_df["_rev"] = trend_df[qty_col].astype(float) * trend_df[price_col].astype(float)
                elif amount_col:
                    trend_df = trend_df[trend_df[amount_col].notna()].copy()
                    trend_df["_rev"] = trend_df[amount_col].astype(float)
                elif price_col:
                    trend_df = trend_df[trend_df[price_col].notna()].copy()
                    trend_df["_rev"] = trend_df[price_col].astype(float)
                elif qty_col:
                    trend_df = trend_df[trend_df[qty_col].notna()].copy()
                    trend_df["_rev"] = trend_df[qty_col].astype(float)
                else:
                    trend_df["_rev"] = 0.0

                grouped = trend_df.groupby("_month")
                month_records = []
                for month_str, grp in sorted(grouped):
                    orders_count = int(len(grp))
                    total_rev = round(float(grp["_rev"].sum()), 2)
                    month_records.append({
                        "month": str(month_str),
                        "total_orders": orders_count,
                        "total_revenue": total_rev,
                    })
                monthly_trend = month_records

        # =====================================================================
        # 5. NOTABLE PATTERNS (Deterministic Pandas Logic on validated subset)
        # =====================================================================
        notable_patterns: List[str] = []

        # Pattern 1: Dominant categorical segments (most frequent)
        for col in categorical_cols:
            if col in categorical_summary and len(categorical_summary[col]) > 0:
                top_item = categorical_summary[col][0]
                if top_item["percentage"] >= 30:
                    notable_patterns.append(
                        f"'{top_item['value']}' leads {col} representing {top_item['percentage']}% of records ({top_item['count']} occurrences)."
                    )

        # Pattern 2: Highest average price / revenue per category on validated subset
        metric_col = next((c for c in numeric_cols if any(k in c.lower() for k in ["price", "unit_price", "amount", "salary", "revenue"])), None)
        group_cat_col = next((c for c in categorical_cols if any(k in c.lower() for k in ["product", "department", "category", "region", "payment_method"])), None)

        if metric_col and group_cat_col:
            clean_pairs = validated_df[[group_cat_col, metric_col]].dropna()
            if len(clean_pairs) >= 2:
                grp_means = clean_pairs.groupby(group_cat_col)[metric_col].mean().sort_values(ascending=False)
                if len(grp_means) > 0:
                    highest_cat = grp_means.index[0]
                    highest_avg = grp_means.iloc[0]
                    notable_patterns.append(
                        f"'{highest_cat}' has the highest average {metric_col} (${highest_avg:,.2f})."
                    )

        # Pattern 3: Strong correlations (|r| >= 0.5)
        if len(correlation_matrix["columns"]) >= 2:
            cols = correlation_matrix["columns"]
            mat = correlation_matrix["matrix"]
            checked_pairs = set()
            for i in range(len(cols)):
                for j in range(i + 1, len(cols)):
                    c1, c2 = cols[i], cols[j]
                    r_val = mat[i][j]
                    pair_key = tuple(sorted([c1, c2]))
                    if pair_key not in checked_pairs:
                        checked_pairs.add(pair_key)
                        if r_val >= 0.6:
                            notable_patterns.append(
                                f"Strong positive correlation between {c1} and {c2} (r = {r_val:.2f})."
                            )
                        elif r_val <= -0.6:
                            notable_patterns.append(
                                f"Noticeable inverse correlation between {c1} and {c2} (r = {r_val:.2f})."
                            )

        # Pattern 4: Peak monthly period
        if len(monthly_trend) > 1:
            peak_month_item = max(monthly_trend, key=lambda x: x["total_revenue"])
            if peak_month_item["total_revenue"] > 0:
                notable_patterns.append(
                    f"{peak_month_item['month']} recorded peak revenue of ${peak_month_item['total_revenue']:,.2f} across {peak_month_item['total_orders']} orders."
                )

        if len(notable_patterns) == 0:
            notable_patterns.append("Data is evenly distributed across monitored dimensions with no extreme variance.")

        return {
            "stats_computed_on": stats_computed_on,
            "numeric_summary": numeric_summary,
            "categorical_summary": categorical_summary,
            "correlation_matrix": correlation_matrix,
            "monthly_trend": monthly_trend,
            "notable_patterns": notable_patterns,
        }
