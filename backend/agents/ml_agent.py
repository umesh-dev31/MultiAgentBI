import datetime
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class MLAgent:
    """Standalone Machine Learning Agent responsible for:
    1. Unsupervised anomaly detection via IsolationForest on the validated data subset.
    2. Trend forecasting (linear regression / moving average) on monthly revenue with honest confidence warnings.
    """

    def _filter_validated_subset(
        self, df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None
    ) -> pd.DataFrame:
        """Filters DataFrame to validated subset using identical business rules to EDA and SQL agents."""
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

        # 3. Exclude strictly negative values in non-negative metrics (< 0)
        # Consistent with DataAgent and EDAAgent business rules
        for col in aggregated_metric_cols:
            invalid_mask = data[col] < 0
            for idx in data[invalid_mask].index:
                excluded_indices.add(idx)

        # 4. Exclude extreme statistical outliers (> 3x IQR from median)
        # Only run if quality_report is provided (indicates raw/cleaned df; validated_df has already purged outliers)
        if quality_report:
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

    def detect_anomalies(
        self, df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Runs scikit-learn IsolationForest on numeric features (quantity, unit_price, computed revenue)
        from the validated subset and generates plain-English explanations for each flagged anomaly.
        """
        validated_df = self._filter_validated_subset(df, quality_report=quality_report)
        if validated_df.empty or len(validated_df) < 5:
            return {
                "total_evaluated": len(validated_df),
                "anomaly_count": 0,
                "features_used": [],
                "anomalies": [],
                "note": "Insufficient data points for IsolationForest anomaly detection (minimum 5 validated rows required).",
            }

        data = validated_df.copy()

        # Identify structural columns
        qty_col = next((c for c in data.columns if any(k in c.lower() for k in ["qty", "quantity"])), None)
        price_col = next((c for c in data.columns if any(k in c.lower() for k in ["price", "unit_price"])), None)
        rev_col = next((c for c in data.columns if any(k in c.lower() for k in ["revenue", "amount", "sales", "total"])), None)
        cat_col = next((c for c in data.columns if any(k in c.lower() for k in ["product", "category", "item"])), None)

        raw_features: List[str] = []
        if qty_col and pd.api.types.is_numeric_dtype(data[qty_col]):
            raw_features.append(qty_col)
        if price_col and pd.api.types.is_numeric_dtype(data[price_col]):
            raw_features.append(price_col)
        if rev_col and pd.api.types.is_numeric_dtype(data[rev_col]):
            raw_features.append(rev_col)
        elif qty_col and price_col:
            data["_computed_revenue"] = data[qty_col] * data[price_col]
            raw_features.append("_computed_revenue")

        if not raw_features:
            raw_features = [c for c in data.select_dtypes(include=[np.number]).columns if not c.lower().endswith("_id")]

        if len(raw_features) < 1:
            return {
                "total_evaluated": len(data),
                "anomaly_count": 0,
                "features_used": [],
                "anomalies": [],
                "note": "No suitable numeric features found for anomaly detection.",
            }

        # ---------------------------------------------------------------
        # Build per-category medians for qty and price so the IsolationForest
        # receives category-relative deviation scores, not raw values.
        # This prevents naturally expensive categories (e.g. Laptop at
        # $60,000) from being penalised just because cheaper categories
        # (Mouse, Keyboard) pull the overall median down.
        # ---------------------------------------------------------------
        cat_qty_medians: Dict[str, float] = {}
        cat_price_medians: Dict[str, float] = {}
        overall_qty_median = float(data[qty_col].median()) if qty_col else 0.0
        overall_price_median = float(data[price_col].median()) if price_col else 0.0

        if cat_col:
            if qty_col:
                cat_qty_medians = (
                    data.groupby(cat_col)[qty_col]
                    .median()
                    .fillna(overall_qty_median)
                    .to_dict()
                )
            if price_col:
                cat_price_medians = (
                    data.groupby(cat_col)[price_col]
                    .median()
                    .fillna(overall_price_median)
                    .to_dict()
                )

        def _cat_median(col_medians: Dict[str, float], overall: float, cat_val) -> float:
            """Return the category-specific median if available, else overall."""
            if cat_val and cat_val in col_medians:
                m = col_medians[cat_val]
                return m if m > 0 else overall
            return overall

        # Build normalised feature columns (% deviation from category median, clipped)
        norm_cols: List[str] = []
        if qty_col:
            col_name = "_norm_qty"
            data[col_name] = data.apply(
                lambda r: (r[qty_col] - _cat_median(cat_qty_medians, overall_qty_median, r.get(cat_col)))
                          / max(_cat_median(cat_qty_medians, overall_qty_median, r.get(cat_col)), 1e-6),
                axis=1,
            )
            norm_cols.append(col_name)

        if price_col:
            col_name = "_norm_price"
            data[col_name] = data.apply(
                lambda r: (r[price_col] - _cat_median(cat_price_medians, overall_price_median, r.get(cat_col)))
                          / max(_cat_median(cat_price_medians, overall_price_median, r.get(cat_col)), 1e-6),
                axis=1,
            )
            norm_cols.append(col_name)

        if "_computed_revenue" in raw_features:
            # Revenue deviation: use category-specific qty+price combo
            data["_norm_revenue"] = data["_computed_revenue"] / (
                data.apply(
                    lambda r: _cat_median(cat_qty_medians, overall_qty_median, r.get(cat_col))
                              * _cat_median(cat_price_medians, overall_price_median, r.get(cat_col)),
                    axis=1,
                ).replace(0, 1e-6)
            )
            norm_cols.append("_norm_revenue")

        iso_features = norm_cols if norm_cols else raw_features

        X_df = data[iso_features].fillna(0.0)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_df)

        # Fit Isolation Forest on category-normalised features
        contamination = min(0.12, max(0.04, 3.0 / len(data)))
        iso_forest = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42,
        )
        preds = iso_forest.fit_predict(X_scaled)
        scores = iso_forest.decision_function(X_scaled)

        min_score = float(np.min(scores))
        max_score = float(np.max(scores))
        score_range = max(max_score - min_score, 1e-6)

        anomaly_indices = np.where(preds == -1)[0]
        anomalies_list = []

        for idx in anomaly_indices:
            row = data.iloc[idx]
            raw_score = float(scores[idx])
            normalized_score = round(float((max_score - raw_score) / score_range * 100), 1)

            # Category of this row (for per-category comparisons in the explanation)
            category_val = str(row[cat_col]) if cat_col and cat_col in row.index else None

            reasons: List[str] = []

            # ---- Quantity explanation (always category-relative) ----
            if qty_col and qty_col in row.index:
                q_val = float(row[qty_col])
                cat_q_med = _cat_median(cat_qty_medians, overall_qty_median, category_val)
                pct_dev = (q_val - cat_q_med) / max(cat_q_med, 1e-6) * 100
                if pct_dev > 150:  # >2.5× category median
                    reasons.append(
                        f"Quantity {int(q_val)} is {pct_dev:.0f}% above the "
                        f"'{category_val}' category median of {cat_q_med:g}"
                        if category_val else
                        f"Quantity {int(q_val)} is {pct_dev:.0f}% above the overall median of {cat_q_med:g}"
                    )

            # ---- Price explanation (always category-relative) ----
            if price_col and price_col in row.index:
                p_val = float(row[price_col])
                cat_p_med = _cat_median(cat_price_medians, overall_price_median, category_val)
                pct_dev = (p_val - cat_p_med) / max(cat_p_med, 1e-6) * 100
                if pct_dev > 150:
                    reasons.append(
                        f"Unit price ${p_val:,.2f} is {pct_dev:.0f}% above the "
                        f"'{category_val}' category median of ${cat_p_med:,.2f}"
                        if category_val else
                        f"Unit price ${p_val:,.2f} is {pct_dev:.0f}% above the overall median of ${cat_p_med:,.2f}"
                    )
                elif pct_dev < -70:  # price less than 30% of category median
                    reasons.append(
                        f"Unit price ${p_val:,.2f} is {abs(pct_dev):.0f}% below the "
                        f"'{category_val}' category median of ${cat_p_med:,.2f}"
                        if category_val else
                        f"Unit price ${p_val:,.2f} is {abs(pct_dev):.0f}% below the overall median of ${cat_p_med:,.2f}"
                    )

            # ---- Revenue explanation ----
            if "_computed_revenue" in data.columns and "_computed_revenue" in row.index:
                r_val = float(row["_computed_revenue"])
                cat_rev_baseline = (
                    _cat_median(cat_qty_medians, overall_qty_median, category_val)
                    * _cat_median(cat_price_medians, overall_price_median, category_val)
                )
                if cat_rev_baseline > 0:
                    rev_pct = (r_val - cat_rev_baseline) / cat_rev_baseline * 100
                    if rev_pct > 200:
                        reasons.append(
                            f"Transaction value ${r_val:,.2f} is {rev_pct:.0f}% above the "
                            f"'{category_val}' typical revenue of ${cat_rev_baseline:,.2f}"
                            if category_val else
                            f"Transaction value ${r_val:,.2f} is {rev_pct:.0f}% above the typical ${cat_rev_baseline:,.2f}"
                        )

            if not reasons:
                reasons.append(
                    f"Multi-dimensional statistical outlier within the '{category_val}' category "
                    f"as identified by IsolationForest."
                    if category_val else
                    "Multi-dimensional feature deviation flagged by IsolationForest."
                )

            # Build clean record dict
            record_dict = {}
            for col in data.columns:
                if col.startswith("_"):
                    continue
                v = row[col]
                if pd.isna(v):
                    record_dict[col] = None
                elif isinstance(v, (np.floating, float)):
                    record_dict[col] = round(float(v), 2)
                elif isinstance(v, (np.integer, int)):
                    record_dict[col] = int(v)
                else:
                    record_dict[col] = str(v)

            anomalies_list.append({
                "row_index": int(idx + 1),
                "anomaly_score": normalized_score,
                "severity": "High" if normalized_score >= 70 else "Medium",
                "reason": " & ".join(reasons),
                "record": record_dict,
            })

        anomalies_list.sort(key=lambda x: x["anomaly_score"], reverse=True)

        public_features = [f for f in raw_features if not f.startswith("_")]
        return {
            "total_evaluated": int(len(data)),
            "anomaly_count": int(len(anomalies_list)),
            "features_used": public_features,
            "anomalies": anomalies_list[:12],
            "note": (
                f"Evaluated {len(data)} validated records using IsolationForest on "
                f"per-category normalised deviations for: {', '.join(public_features)}. "
                f"Each feature is scored relative to its product category's own median, "
                f"not the global dataset median."
            ),
        }

    def _next_monthly_periods(self, last_month_str: str, count: int = 3) -> List[str]:
        """Generates the next YYYY-MM period strings following last_month_str."""
        try:
            parts = last_month_str.split("-")
            year = int(parts[0])
            month = int(parts[1])
        except Exception:
            year = datetime.datetime.now().year
            month = datetime.datetime.now().month

        results = []
        for _ in range(count):
            month += 1
            if month > 12:
                month = 1
                year += 1
            results.append(f"{year:04d}-{month:02d}")
        return results

    def forecast_trend(
        self, df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Groups historical data monthly (identical to EDA Agent) and projects next 2-3 periods
        using linear regression / moving averages with an honest data-sufficiency evaluation.
        """
        validated_df = self._filter_validated_subset(df, quality_report=quality_report)
        if validated_df.empty:
            return {
                "historical": [],
                "forecast": [],
                "confidence_level": "insufficient",
                "confidence_note": "Dataset is empty after validation filtering.",
                "data_points_count": 0,
            }

        # Date column detection
        date_cols = [
            c for c in validated_df.columns
            if any(kw in str(c).lower() for kw in ["order_date", "date", "timestamp", "created_at"])
        ]
        if not date_cols:
            return {
                "historical": [],
                "forecast": [],
                "confidence_level": "none",
                "confidence_note": "No temporal date column detected to project forecasts.",
                "data_points_count": 0,
            }

        date_col = date_cols[0]
        dt_series = pd.to_datetime(validated_df[date_col], format="mixed", errors="coerce")

        trend_df = validated_df.copy()
        trend_df["_dt"] = dt_series
        trend_df = trend_df[trend_df["_dt"].notna()].copy()

        if trend_df.empty:
            return {
                "historical": [],
                "forecast": [],
                "confidence_level": "insufficient",
                "confidence_note": "Date values could not be parsed into valid timestamps.",
                "data_points_count": 0,
            }

        trend_df["_month"] = trend_df["_dt"].dt.strftime("%Y-%m")

        # Metric detection
        qty_col = next((c for c in trend_df.columns if any(k in c.lower() for k in ["qty", "quantity"])), None)
        price_col = next((c for c in trend_df.columns if any(k in c.lower() for k in ["price", "unit_price"])), None)
        amount_col = next((c for c in trend_df.columns if any(k in c.lower() for k in ["revenue", "amount", "sales", "total"])), None)

        if qty_col and price_col:
            trend_df = trend_df[trend_df[qty_col].notna() & trend_df[price_col].notna()].copy()
            trend_df["_rev"] = trend_df[qty_col].astype(float) * trend_df[price_col].astype(float)
        elif amount_col:
            trend_df = trend_df[trend_df[amount_col].notna()].copy()
            trend_df["_rev"] = trend_df[amount_col].astype(float)
        else:
            trend_df["_rev"] = 1.0

        grouped = trend_df.groupby("_month")
        historical: List[Dict[str, Any]] = []
        for month_str, grp in sorted(grouped):
            orders_count = int(len(grp))
            total_rev = round(float(grp["_rev"].sum()), 2)
            historical.append({
                "period": str(month_str),
                "revenue": total_rev,
                "orders": orders_count,
            })

        num_periods = len(historical)

        # 1. Less than 2 periods: Cannot fit trend
        if num_periods < 2:
            return {
                "historical": historical,
                "forecast": [],
                "confidence_level": "insufficient",
                "confidence_note": f"Only {num_periods} monthly period detected. At least 2 distinct historical periods are required for trend forecasting.",
                "data_points_count": num_periods,
            }

        # 2. Fit Linear Regression model over time index
        x = np.arange(num_periods, dtype=float)
        y_rev = np.array([h["revenue"] for h in historical], dtype=float)
        y_orders = np.array([h["orders"] for h in historical], dtype=float)

        # Polyfit linear trend: y = m*x + b
        m_rev, b_rev = np.polyfit(x, y_rev, deg=1)
        m_orders, b_orders = np.polyfit(x, y_orders, deg=1)

        # Confidence assessment (honest assessment per prompt)
        if num_periods < 6:
            confidence_level = "low"
            confidence_note = (
                f"Low confidence — limited historical data ({num_periods} periods available). "
                "The projection reflects a basic linear trajectory, but cannot account for seasonality or demand shifts."
            )
        else:
            confidence_level = "moderate"
            confidence_note = (
                f"Moderate confidence — based on {num_periods} historical monthly periods. "
                "Linear model captures recent growth/decay trajectory."
            )

        # Trend direction
        if m_rev > 50:
            trend_direction = "Upward Growth"
        elif m_rev < -50:
            trend_direction = "Declining Trajectory"
        else:
            trend_direction = "Stable / Flat"

        # Generate next 3 periods
        last_month = historical[-1]["period"]
        future_months = self._next_monthly_periods(last_month, count=3)

        forecast: List[Dict[str, Any]] = []
        for i, f_month in enumerate(future_months):
            idx = num_periods + i
            pred_rev = float(m_rev * idx + b_rev)
            # Ensure revenue doesn't predict negative
            pred_rev = max(0.0, round(pred_rev, 2))

            pred_orders = int(round(max(1.0, float(m_orders * idx + b_orders))))

            forecast.append({
                "period": f_month,
                "predicted_value": pred_rev,
                "predicted_orders": pred_orders,
                "confidence_note": confidence_note,
            })

        return {
            "historical": historical,
            "forecast": forecast,
            "confidence_level": confidence_level,
            "confidence_note": confidence_note,
            "data_points_count": num_periods,
            "trend_direction": trend_direction,
            "monthly_growth_rate": round(float(m_rev), 2),
        }

    def analyze(
        self, df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Combines anomaly detection and forecasting for API consumption."""
        anomalies_res = self.detect_anomalies(df, quality_report=quality_report)
        forecast_res = self.forecast_trend(df, quality_report=quality_report)
        return {
            "anomalies": anomalies_res,
            "forecast": forecast_res,
        }
