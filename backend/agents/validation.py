"""Determine which rows are eligible for each analysis while preserving the original dataset."""
import numpy as np
import pandas as pd
import base64

def eligible_subset(df, columns=(), date_column=None):
    """Select rows with valid values in the requested numeric and date columns. Track exclusions with audit reasons."""
    data = df.copy()
    # Track original source row numbers. CSV data starts on line 2.
    source = list(df.attrs.get('source_rows', range(2, len(df) + 2)))
    keep = pd.Series(True, index=data.index)
    reasons = []
    reason_counts = {}

    # Validate numeric columns.
    for col in columns:
        values = pd.to_numeric(data[col], errors='coerce')
        valid = values.notna() & np.isfinite(values)

        # Apply user-defined bounds such as price >= 0.
        rule = df.attrs.get('numeric_constraints', {}).get(col, {})
        if rule.get('minimum') is not None:
            valid &= values >= rule['minimum']
        if rule.get('maximum') is not None:
            valid &= values <= rule['maximum']

        data[col] = values
        bad = np.flatnonzero(~valid.to_numpy())
        reason_counts[col] = len(bad)

        # Record up to 100 exclusion reasons for display.
        for i in bad[:max(0, 100 - len(reasons))]:
            reasons.append({
                'row_index': source[i],
                'column': col,
                'reason': 'Missing, non-finite, unparseable, or outside explicit numeric constraint'
            })
        keep &= valid

    # Validate the date column when the analysis uses dates.
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

    # Build a DataFrame containing only eligible rows.
    result = data.loc[keep].copy().reset_index(drop=True)
    result.attrs = dict(df.attrs)
    result.attrs['source_rows'] = [r for r, k in zip(source, keep) if k]

    # Return counts and reasons for included and excluded rows.
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
    """Return a safe copy, or an empty DataFrame when the input is None."""
    return pd.DataFrame() if df is None else df.copy()

def numeric_columns(df):
    """Find numeric columns and skip identifiers such as order_id and user_id."""
    schema = df.attrs.get('schema')
    if schema:
        return [c['name'] for c in schema if c['role'] == 'numeric']
    return [c for c in df.select_dtypes(include=[np.number]).columns if not (c.lower() == 'id' or c.lower().endswith('_id'))]

def temporal_inputs(df):
    """Identify the date and metric columns for time-series analysis."""
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
