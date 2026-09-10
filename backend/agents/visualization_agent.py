import re
from typing import Any, Dict, List, Optional
import pandas as pd


class VisualizationAgent:
    """Standalone Visualization Agent that evaluates the dataset and EDA output
    to recommend 2-3 highly informative chart specifications for frontend rendering.
    """

    def _get_validated_df(
        self, df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None
    ) -> pd.DataFrame:
        """Constructs a clean validated subset for metric aggregations,
        filtering negative quantities/prices, statistical outliers (> 3x IQR), and extreme nulls.
        """
        if df is None or df.empty:
            return pd.DataFrame()

        data = df.copy().reset_index(drop=True)
        # Drop columns with all NaNs
        data = data.dropna(how="all", axis=1)

        numeric_cols: List[str] = []
        for col in data.columns:
            num_s = pd.to_numeric(data[col], errors="coerce")
            if len(data) > 0 and (num_s.notna().sum() / len(data)) > 0.6:
                numeric_cols.append(col)
                data[col] = num_s

        excluded_indices = set()

        # 1. Outliers from DataQualityReport
        if quality_report and "flagged_for_review" in quality_report:
            for item in quality_report["flagged_for_review"]:
                reason = str(item.get("reason", "")).lower()
                if "outlier" in reason:
                    r_idx = item.get("row_index")
                    if isinstance(r_idx, int) and (r_idx - 1) in data.index:
                        excluded_indices.add(r_idx - 1)

        # 2. Aggregated metric columns
        metric_cols = [
            c for c in numeric_cols
            if any(k in str(c).lower() for k in ["qty", "quantity", "price", "unit_price", "amount", "revenue", "sales", "total"])
        ]
        if not metric_cols:
            metric_cols = [c for c in numeric_cols if not str(c).lower().endswith("_id")]

        # Filter negative and zero values
        for c in metric_cols:
            invalid_mask = data[c] <= 0
            for idx in data[invalid_mask].index:
                excluded_indices.add(idx)

        # 3. Detect extreme statistical outliers (> 3x IQR from median)
        for col in metric_cols:
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

        # 4. Exclude null values in aggregated columns
        for col in metric_cols:
            null_mask = data[col].isna()
            for idx in data[null_mask].index:
                excluded_indices.add(idx)

        validated_mask = ~data.index.isin(excluded_indices)
        return data[validated_mask].copy().reset_index(drop=True)

    def suggest_charts(
        self,
        df: Optional[pd.DataFrame],
        eda_result: Optional[Dict[str, Any]] = None,
        quality_report: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Given the cleaned DataFrame and EDA output, determines the 2-3 most
        informative charts for this dataset and returns chart SPECS.

        Args:
            df: Cleaned pandas DataFrame.
            eda_result: Output dict from EDAAgent.analyze().

        Returns:
            Dict containing 'charts': list of {"chart_type", "title", "x_field", "y_field", "data"}.
        """
        if df is None or df.empty:
            return {"charts": []}

        eda = eda_result or {}
        monthly_trend = eda.get("monthly_trend", [])
        categorical_summary = eda.get("categorical_summary", {})

        validated_df = self._get_validated_df(df, quality_report=quality_report)
        charts: List[Dict[str, Any]] = []

        # -------------------------------------------------------------
        # 1. Temporal Trend Chart (Line Chart)
        # -------------------------------------------------------------
        if monthly_trend and len(monthly_trend) >= 2:
            charts.append({
                "chart_type": "line",
                "title": "Monthly Revenue & Order Trend",
                "x_field": "month",
                "y_field": "total_revenue",
                "secondary_y_field": "total_orders",
                "data": monthly_trend,
            })

        # -------------------------------------------------------------
        # Helper: Determine best categorical columns & revenue metric
        # -------------------------------------------------------------
        cat_cols = [
            c for c in validated_df.columns
            if not pd.api.types.is_numeric_dtype(validated_df[c])
            and not any(k in str(c).lower() for k in ["date", "time", "_id", "id", "url", "description", "note"])
        ]

        # Prioritize high-impact business dimensions
        def cat_priority(col_name: str) -> int:
            name = col_name.lower()
            if "region" in name or "country" in name or "state" in name:
                return 1
            if "category" in name or "product" in name or "item" in name:
                return 2
            if "department" in name or "segment" in name:
                return 3
            if "payment" in name or "channel" in name:
                return 4
            return 10

        cat_cols.sort(key=cat_priority)

        # Determine revenue calculation
        qty_col = next((c for c in validated_df.columns if any(k in str(c).lower() for k in ["qty", "quantity"])), None)
        price_col = next((c for c in validated_df.columns if any(k in str(c).lower() for k in ["price", "unit_price"])), None)
        amount_col = next((c for c in validated_df.columns if any(k in str(c).lower() for k in ["revenue", "sales", "total", "amount"])), None)

        calc_df = validated_df.copy()
        if qty_col and price_col:
            calc_df["_computed_revenue"] = pd.to_numeric(calc_df[qty_col], errors="coerce").fillna(0) * pd.to_numeric(calc_df[price_col], errors="coerce").fillna(0)
            rev_metric = "_computed_revenue"
        elif amount_col:
            calc_df["_computed_revenue"] = pd.to_numeric(calc_df[amount_col], errors="coerce").fillna(0)
            rev_metric = "_computed_revenue"
        elif price_col:
            calc_df["_computed_revenue"] = pd.to_numeric(calc_df[price_col], errors="coerce").fillna(0)
            rev_metric = "_computed_revenue"
        else:
            rev_metric = None

        used_cats = set()

        # -------------------------------------------------------------
        # 2. Categorical Revenue Breakdown (Bar Chart)
        # -------------------------------------------------------------
        if cat_cols and rev_metric:
            primary_cat = cat_cols[0]
            used_cats.add(primary_cat)

            clean_grp = calc_df[[primary_cat, rev_metric]].dropna()
            clean_grp[primary_cat] = clean_grp[primary_cat].astype(str).str.strip()
            clean_grp = clean_grp[clean_grp[primary_cat] != ""]

            if not clean_grp.empty:
                grouped = clean_grp.groupby(primary_cat)[rev_metric].sum().reset_index()
                grouped = grouped.sort_values(by=rev_metric, ascending=False).head(8)

                bar_data = [
                    {
                        primary_cat: str(row[primary_cat]),
                        "revenue": round(float(row[rev_metric]), 2),
                    }
                    for _, row in grouped.iterrows()
                ]

                clean_title_cat = primary_cat.replace("_", " ").title()
                charts.append({
                    "chart_type": "bar",
                    "title": f"Total Revenue by {clean_title_cat}",
                    "x_field": primary_cat,
                    "y_field": "revenue",
                    "data": bar_data,
                })

        # -------------------------------------------------------------
        # 3. Distribution Share (Pie Chart)
        # -------------------------------------------------------------
        # Pick a secondary categorical dimension for distribution
        sec_cat = None
        for c in cat_cols:
            if c not in used_cats:
                sec_cat = c
                break

        if not sec_cat and cat_cols:
            sec_cat = cat_cols[0]

        if sec_cat:
            # Use categorical_summary if available or compute directly
            pie_data = []
            if sec_cat in categorical_summary and categorical_summary[sec_cat]:
                for item in categorical_summary[sec_cat]:
                    pie_data.append({
                        "name": str(item.get("value", "")),
                        "value": int(item.get("count", 0)),
                        "percentage": float(item.get("percentage", 0.0)),
                    })
            else:
                s = validated_df[sec_cat].dropna().astype(str).str.strip()
                s = s[s != ""]
                counts = s.value_counts().head(5)
                tot = len(s) if len(s) > 0 else 1
                for val, cnt in counts.items():
                    pie_data.append({
                        "name": str(val),
                        "value": int(cnt),
                        "percentage": round(float((cnt / tot) * 100), 1),
                    })

            if pie_data:
                clean_title_cat = sec_cat.replace("_", " ").title()
                charts.append({
                    "chart_type": "pie",
                    "title": f"Distribution by {clean_title_cat}",
                    "x_field": "name",
                    "y_field": "value",
                    "data": pie_data,
                })

        # -------------------------------------------------------------
        # 4. Fallback: If fewer than 2 charts, add another bar chart
        # -------------------------------------------------------------
        if len(charts) < 2 and len(cat_cols) > 1 and rev_metric:
            other_cat = cat_cols[1]
            if other_cat not in used_cats:
                clean_grp = calc_df[[other_cat, rev_metric]].dropna()
                clean_grp[other_cat] = clean_grp[other_cat].astype(str).str.strip()
                clean_grp = clean_grp[clean_grp[other_cat] != ""]
                if not clean_grp.empty:
                    grouped = clean_grp.groupby(other_cat)[rev_metric].sum().reset_index()
                    grouped = grouped.sort_values(by=rev_metric, ascending=False).head(8)
                    bar_data = [
                        {
                            other_cat: str(row[other_cat]),
                            "revenue": round(float(row[rev_metric]), 2),
                        }
                        for _, row in grouped.iterrows()
                    ]
                    clean_title_cat = other_cat.replace("_", " ").title()
                    charts.append({
                        "chart_type": "bar",
                        "title": f"Revenue by {clean_title_cat}",
                        "x_field": other_cat,
                        "y_field": "revenue",
                        "data": bar_data,
                    })

        # Return top 3 charts max
        return {"charts": charts[:3]}
