"""
Data Agent
----------
Ye agent raw CSV / Excel files ko ingest, audit aur clean karta hai.

Key principles:
1. Data Preservation: Koi bhi data silently delete nahi hota.
2. Identifiers Protection: IDs (jaise 'ORD-001', 'SKU-99') ko string rakhte hain, number me convert karke NaN nahi banate.
3. Multi-currency Support: Currency symbols ($, €, £, ¥, ₹) clean karke pure numbers nikaalta hai.
4. Complete Audit Trail: Har row me jo bhi issue ya change hua, uska row number aur reason record hota hai.
"""
import re
import csv
import zipfile
from pathlib import Path
import numpy as np
import pandas as pd
from contracts import ImportOptions, POLICY_VERSION, records
from config import Settings

# Regex: Identifier columns pehchanne ke liye (e.g. order_id, user_uuid, zip_code)
IDENTIFIER = re.compile(r'^(id|uuid|guid|sku|zip|zipcode|postal_code|phone|.*_id|.*_code)$', re.I)

# Common numeric column names
NUMERIC_NAMES = {
    'quantity', 'qty', 'price', 'unit_price', 'amount', 'salary', 'cost',
    'revenue', 'sales', 'total', 'discount', 'rating', 'score', 'experience',
    'age', 'count', 'balance', 'fee', 'temperature', 'profit'
}

# Regex: Date columns pehchanne ke liye
DATE_NAME = re.compile(r'(^date$|_date$|^timestamp$|_at$|^datetime$)', re.I)

def number(value):
    """
    Currency symbols (₹, $, €, etc.), commas aur spaces ko hata kar
    string ko clean float number me convert karta hai.
    Agar convert na ho sake (invalid text), to np.nan return karta hai.
    """
    if value is None or pd.isna(value):
        return np.nan
    # Currency symbols aur unwanted spaces strip karo
    text = re.sub(r'[$€£¥₹\s,]', '', str(value))
    try:
        parsed = float(text)
        return parsed if np.isfinite(parsed) else np.nan
    except ValueError:
        return np.nan

class DataAgent:
    def __init__(self):
        self.last_cleaned_df = None

    def process(self, file_path, options=None, settings=None):
        """
        Main pipeline function:
        1. File validation (size & extensions)
        2. Safe loading into DataFrame
        3. Column role detection (numeric, date, identifier, text)
        4. Cleaning & Auditing (record all issues row-by-row)
        5. Optional imputation & deduplication
        6. Health score calculation
        """
        options = options if isinstance(options, ImportOptions) else ImportOptions(**(options or {}))
        settings = settings or Settings()
        path = Path(file_path)

        # -------------------------------------------------------------
        # Step 1: File size & safety checks
        # -------------------------------------------------------------
        if path.stat().st_size > settings.max_upload_bytes:
            raise ValueError('Upload exceeds byte limit')

        # CSV Read: UTF-8 BOM handle karta hai aur blank lines preserve karta hai
        if path.suffix.lower() == '.csv':
            with path.open(encoding='utf-8-sig', newline='') as stream:
                if len(next(csv.reader(stream), [])) > settings.max_columns:
                    raise ValueError('Dataset column limit exceeded')
            frame = pd.read_csv(path, dtype=str, keep_default_na=False, skip_blank_lines=False, nrows=settings.max_rows + 1)

        # Excel Read (.xlsx / .xls): Zip bomb protection ke saath decompress check
        elif path.suffix.lower() in {'.xls', '.xlsx'}:
            if path.suffix.lower() == '.xlsx':
                with zipfile.ZipFile(path) as archive:
                    if sum(i.file_size for i in archive.infolist()) > settings.max_excel_bytes:
                        raise ValueError('Excel decompression limit exceeded')
            frame = pd.read_excel(path, dtype=str, keep_default_na=False, nrows=settings.max_rows + 1)
        else:
            raise ValueError('Only CSV, XLSX and XLS files are supported')

        # Limits check
        if len(frame) > settings.max_rows or len(frame.columns) > settings.max_columns:
            raise ValueError('Dataset row or column limit exceeded')
        if frame.empty:
            raise ValueError('Dataset has no data rows')
        if (set(options.column_roles) | set(options.numeric_constraints)) - set(frame.columns):
            raise ValueError('Import options refer to unknown columns')

        # -------------------------------------------------------------
        # Step 2: Setup tracking & original row indices
        # CSV me headers line 1 par hoti hain, so data row 2 se shuru hoti hai
        # -------------------------------------------------------------
        source = list(range(2, len(frame) + 2))
        raw_duplicates = frame.duplicated()
        original_rows = len(frame)
        issues, changes, schema = [], [], []
        fixed = dict.fromkeys([
            'whitespace_trimmed', 'casing_normalized', 'currency_or_thousands_parsed',
            'null_literals_converted', 'duplicate_rows_dropped', 'missing_values_imputed'
        ], 0)

        def audit(i, col, raw, reason, change=False):
            """Audit log helper: Har issue ya transformation ka record rakhta hai."""
            (changes if change else issues).append({
                'row_index': source[i],
                'column': col,
                'original_value': raw,
                'reason': reason
            })

        # -------------------------------------------------------------
        # Step 3: Column-by-column role detection & parsing
        # -------------------------------------------------------------
        for col in frame.columns:
            raw_values = frame[col].tolist()
            nonempty = frame[col][frame[col] != '']

            # Column role detect karo: identifier, date, numeric, ya text
            role = options.column_roles.get(col)
            if role is None:
                if IDENTIFIER.fullmatch(col):
                    role = 'identifier'
                elif DATE_NAME.search(col):
                    role = 'date'
                elif col.lower() in NUMERIC_NAMES:
                    role = 'numeric'
                # Leading zeros wale numbers (e.g. '0123') postal codes ho sakte hain, unhe text rehne do
                elif len(nonempty) and nonempty.map(number).notna().all() and not nonempty.str.match(r'^[+-]?0\d').any():
                    role = 'numeric'
                else:
                    role = 'text'

            parsed = []
            invalid_indices = set()

            # Har cell ki value parse karo aur issues flag karo
            for i, raw in enumerate(raw_values):
                value = raw if raw != '' else None

                # Numeric handling: currency strip karo aur float banao
                if role == 'numeric':
                    value = number(value)
                    if pd.isna(value):
                        audit(i, col, raw, 'Missing or unparseable numeric value')
                        if raw != '':
                            invalid_indices.add(i)
                    elif str(value) != raw:
                        audit(i, col, raw, 'Parsed numeric representation', True)
                        fixed['currency_or_thousands_parsed'] += 1

                # Date handling: Ambiguous dates (e.g. 05/06/2024) detect karo aur standard ISO format me lao
                elif role == 'date' and value is not None:
                    try:
                        match = re.fullmatch(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', value)
                        if match and int(match[1]) <= 12 and int(match[2]) <= 12 and match[1] != match[2] and options.date_order == 'unresolved':
                            raise ValueError('Ambiguous date')
                        value = pd.to_datetime(value, format='mixed', dayfirst=options.date_order == 'dayfirst', errors='raise').isoformat()
                        if value != raw:
                            audit(i, col, raw, 'Parsed date representation', True)
                    except (ValueError, TypeError, OverflowError):
                        value = None
                        audit(i, col, raw, 'Invalid or unresolved ambiguous date')

                parsed.append(value)

            frame[col] = parsed
            if role == 'numeric':
                frame[col] = pd.to_numeric(frame[col], errors='coerce')

            # Numeric Constraints check (user ne koi min ya max diya ho to)
            constraint = options.numeric_constraints.get(col)
            if constraint and role != 'numeric':
                raise ValueError('Numeric constraints require a numeric role')
            if constraint and constraint.minimum is not None and constraint.maximum is not None and constraint.minimum > constraint.maximum:
                raise ValueError('Numeric minimum exceeds maximum')
            if constraint:
                for i, value in enumerate(frame[col]):
                    if pd.notna(value) and (
                        (constraint.minimum is not None and value < constraint.minimum) or
                        (constraint.maximum is not None and value > constraint.maximum)
                    ):
                        audit(i, col, raw_values[i], 'Outside explicit numeric constraint')

            # Optional Imputation: Missing values fill karo (agar user ne request kiya ho)
            if options.impute and role not in {'identifier', 'date'}:
                missing = frame[col].isna()
                fill = frame[col].median() if role == 'numeric' else (frame[col].mode().iloc[0] if not frame[col].mode().empty else None)
                if pd.notna(fill):
                    for i in np.flatnonzero(missing.to_numpy()):
                        if i not in invalid_indices:
                            audit(i, col, raw_values[i], f'Explicit imputation with {fill}', True)
                            frame.at[i, col] = fill
                            fixed['missing_values_imputed'] += 1

            # Schema summary item
            schema.append({
                'name': col,
                'role': role,
                'dtype': str(frame[col].dtype),
                'missing_count': int(frame[col].isna().sum()),
                'missing_pct': round(float(frame[col].isna().mean() * 100), 2),
                'imputation_strategy': 'explicit' if options.impute else 'none'
            })

        # -------------------------------------------------------------
        # Step 4: Deduplication handling
        # -------------------------------------------------------------
        duplicates = raw_duplicates
        for i in np.flatnonzero(duplicates.to_numpy()):
            audit(i, '*', None, 'Duplicate row removed' if options.deduplicate else 'Duplicate row retained', options.deduplicate)
        if options.deduplicate:
            source = [r for r, k in zip(source, ~duplicates) if k]
            frame = frame.loc[~duplicates].reset_index(drop=True)
            fixed['duplicate_rows_dropped'] = int(duplicates.sum())

        # Metadata attach karo
        frame.attrs = {
            'source_rows': source,
            'schema': schema,
            'policy_version': POLICY_VERSION,
            'numeric_constraints': {k: v.model_dump() for k, v in options.numeric_constraints.items()}
        }
        self.last_cleaned_df = frame

        # Health score nikaalo (100 me se penalties minus hoti hain)
        health = self._calculate_data_health_score(fixed, issues)
        report = {
            'auto_fixed': fixed,
            'flagged_for_review': issues,
            'changes': changes,
            'data_health_score': health,
            'health_score': health['score'],
            'health_label': health['label']
        }
        preview = [dict(row, _file_row_number=source[i]) for i, row in enumerate(records(frame.head(10)))]

        return {
            'summary': {
                'original_rows': original_rows,
                'cleaned_rows': len(frame),
                'columns_count': len(frame.columns),
                'duplicate_rows_dropped': fixed['duplicate_rows_dropped'],
                'total_missing_values_filled': fixed['missing_values_imputed']
            },
            'shape': list(frame.shape),
            'columns': schema,
            'cleaned_preview': preview,
            'data_quality_report': report,
            'data_health_score': health,
            'policy_version': POLICY_VERSION,
            'cleaning_policy': options.model_dump()
        }

    def _calculate_data_health_score(self, fixed, issues):
        """
        Data Health Score (0 - 100):
        Flagged rows ke hisaab se max 40 points penalty lagti hai.
        >80: Excellent (Green), >=60: Good (Amber), <60: Needs Review (Red).
        """
        flagged = len({i['row_index'] for i in issues})
        penalty = min(40, flagged)
        score = 100 - penalty
        return {
            'score': score,
            'label': 'Excellent' if score > 80 else 'Good' if score >= 60 else 'Needs Review',
            'color': 'green' if score > 80 else 'amber' if score >= 60 else 'red',
            'total_flagged': flagged,
            'total_auto_fixed': sum(fixed.values()),
            'penalties': {'flagged_penalty': penalty, 'auto_fixed_penalty': 0}
        }
