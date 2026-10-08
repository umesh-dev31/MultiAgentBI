"""Shared, idempotent row validation for every analysis agent."""
from typing import Any, Dict, Optional
import numpy as np
import pandas as pd


def validated_subset(df: pd.DataFrame, quality_report: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame() if df is None else df.copy()
    data = df.copy().reset_index(drop=True)
    source_rows = list(df.attrs.get("source_rows", range(2, len(df) + 2)))
    if len(source_rows) != len(data):
        source_rows = list(range(2, len(data) + 2))
    if df.attrs.get("validated"):
        return data
    numeric = []
    for col in data.columns:
        if any(k in str(col).lower() for k in ["date", "timestamp", "created_at"]):
            continue
        values = pd.to_numeric(data[col], errors="coerce").replace([np.inf, -np.inf], np.nan)
        if values.notna().mean() > 0.6 or pd.api.types.is_numeric_dtype(data[col]):
            numeric.append(col)
            data[col] = values
    metrics = [c for c in numeric if any(k in str(c).lower() for k in
               ["qty", "quantity", "price", "amount", "revenue", "sales", "total", "cost", "fee"])]
    if not metrics:
        metrics = [c for c in numeric if str(c).lower() != "id" and not str(c).lower().endswith("_id")]
    excluded_rows = {i.get("row_index") for i in (quality_report or {}).get("flagged_for_review", [])
                     if "outlier" in str(i.get("reason", "")).lower()}
    keep = pd.Series([r not in excluded_rows for r in source_rows], index=data.index)
    for col in metrics:
        values = data[col]
        keep &= values.notna() & (values >= 0)
        valid = values.dropna()
        if len(valid) >= 4:
            iqr = valid.quantile(0.75) - valid.quantile(0.25)
            if iqr > 0:
                med = valid.median()
                keep &= values.between(med - 3 * iqr, med + 3 * iqr)
    result = data.loc[keep].copy().reset_index(drop=True)
    result.attrs["source_rows"] = [r for r, include in zip(source_rows, keep) if include]
    result.attrs["validated"] = True
    result.attrs["original_cleaned_rows"] = len(data)
    return result
