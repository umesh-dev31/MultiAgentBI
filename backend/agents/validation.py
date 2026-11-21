"""
Validation Module
-----------------
Ye module check karta hai ki specific analysis ke liye kaunse rows eligible hain.
Poore dataset ko blindly delete karne ke bajaye, analysis-wise filtering karta hai.
"""
import numpy as np
import pandas as pd
import base64

def eligible_subset(df, columns=(), date_column=None):
    """
    Given columns aur date_column ke liye sirf valid rows filter karke return karta hai.
    Example: Agar revenue calculate karna hai, to sirf valid numbers select honge,
    baaki rows discard nahi hoti balki audit reason ke saath track hoti hain.
    """
    data = df.copy()
    # Har row ka original line number track karte hain (CSV me row 2 se start hoti hai)
    source = list(df.attrs.get('source_rows', range(2, len(df) + 2)))
    keep = pd.Series(True, index=data.index)
    reasons = []
    reason_counts = {}

    # 1. Numeric columns validate karo
    for col in columns:
        values = pd.to_numeric(data[col], errors='coerce')
        valid = values.notna() & np.isfinite(values)

        # User defined min/max constraints check karo (e.g. price >= 0)
        rule = df.attrs.get('numeric_constraints', {}).get(col, {})
        if rule.get('minimum') is not None:
            valid &= values >= rule['minimum']
        if rule.get('maximum') is not None:
            valid &= values <= rule['maximum']

        data[col] = values
        bad = np.flatnonzero(~valid.to_numpy())
        reason_counts[col] = len(bad)

        # Ineligible rows ka reason record karo (max 100 for UI performance)
        for i in bad[:max(0, 100 - len(reasons))]:
            reasons.append({
                'row_index': source[i],
                'column': col,
                'reason': 'Missing, non-finite, unparseable, or outside explicit numeric constraint'
            })
        keep &= valid

    # 2. Date column validate karo (agar time-series analysis ho raha hai)
    if date_column:
        values = pd.to_datetime(data[date_column], format='mixed', errors='coerce', utc=True)
        valid = values.notna()
        bad = np.flatnonzero(~valid.to_numpy())
        reason_counts[date_column] = len(bad)
        for i in bad[:max(0, 100 - len(reasons))]:
            reasons.append({
                'row_index': source[i],
                'column': date_column,
                'reason': 'Missing, invalid, or unresolved date'
            })
        keep &= valid

    # Eligible rows ka filtered dataframe banao
    result = data.loc[keep].copy().reset_index(drop=True)
    result.attrs = dict(df.attrs)
    result.attrs['source_rows'] = [r for r, k in zip(source, keep) if k]

    # Population summary dict return karo (kitni rows include hui, kitni exclude hui aur kyu)
    population = {
        'total_rows': len(df),
        'included_rows': len(result),
        'excluded_rows': len(df) - len(result),
        'source_rows': result.attrs['source_rows'][:100],
        'source_rows_truncated': len(result) > 100,
        'eligible_mask_base64': base64.b64encode(np.packbits(keep.to_numpy(), bitorder='little').tobytes()).decode('ascii'),
        'mask_bitorder': 'little',
        'reasons': reasons,
        'reason_counts': reason_counts,
        'reasons_truncated': sum(reason_counts.values()) > len(reasons)
    }
    return result, population

def validated_subset(df, quality_report=None):
    """Safe copy return karta hai; None hone par empty DataFrame."""
    return pd.DataFrame() if df is None else df.copy()

def numeric_columns(df):
    """
    Dataset se saare numeric columns ke naam dhoond kar nikaalta hai.
    Identifier columns (like order_id, user_id) ko automatically skip karta hai.
    """
    schema = df.attrs.get('schema')
    if schema:
        return [c['name'] for c in schema if c['role'] == 'numeric']
    return [c for c in df.select_dtypes(include=[np.number]).columns if not (c.lower() == 'id' or c.lower().endswith('_id'))]

def temporal_inputs(df):
    """
    Time-series analysis ke liye date column aur metric column (revenue/sales/qty) pehchanta hai.
    """
    schema = df.attrs.get('schema') or []
    # 1. Date column dhoondo
    date = next((c['name'] for c in schema if c['role'] == 'date'), None)
    if date is None:
        date = next((c for c in df.columns if c.lower() == 'date' or c.lower().endswith('_date') or c.lower() in {'timestamp', 'created_at'}), None)

    # 2. Key metric dhoondo (e.g. revenue, sales, quantity * price)
    numeric = numeric_columns(df)
    def find(names):
        return next((c for c in numeric if c.lower() in names), None)

    amount = find({'revenue', 'sales', 'amount', 'total'})
    qty, price = find({'qty', 'quantity'}), find({'price', 'unit_price'})
    metrics = [amount] if amount else [qty, price] if qty and price else [price or qty] if price or qty else []
    return date, metrics
