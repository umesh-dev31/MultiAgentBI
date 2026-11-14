"""Preserving ingestion with explicit, audited transformations."""
import re
import csv
import zipfile
from pathlib import Path
import numpy as np
import pandas as pd
from contracts import ImportOptions, POLICY_VERSION, records
from config import Settings

IDENTIFIER = re.compile(r'^(id|uuid|guid|sku|zip|zipcode|postal_code|phone|.*_id|.*_code)$',re.I)
NUMERIC_NAMES = {'quantity','qty','price','unit_price','amount','salary','cost','revenue','sales','total','discount','rating','score','experience','age','count','balance','fee','temperature','profit'}
DATE_NAME = re.compile(r'(^date$|_date$|^timestamp$|_at$|^datetime$)',re.I)

def number(value):
    if value is None or pd.isna(value):
        return np.nan
    text = re.sub(r'[$€£¥₹\s,]','',str(value))
    try:
        parsed = float(text)
        return parsed if np.isfinite(parsed) else np.nan
    except ValueError:
        return np.nan

class DataAgent:
    def __init__(self):
        self.last_cleaned_df = None

    def process(self,file_path,options=None,settings=None):
        options = options if isinstance(options,ImportOptions) else ImportOptions(**(options or {}))
        settings = settings or Settings()
        path = Path(file_path)
        if path.stat().st_size > settings.max_upload_bytes:
            raise ValueError('Upload exceeds byte limit')
        if path.suffix.lower() == '.csv':
            with path.open(encoding='utf-8-sig',newline='') as stream:
                if len(next(csv.reader(stream),[]))>settings.max_columns:
                    raise ValueError('Dataset column limit exceeded')
            frame = pd.read_csv(path,dtype=str,keep_default_na=False,skip_blank_lines=False,nrows=settings.max_rows+1)
        elif path.suffix.lower() in {'.xls','.xlsx'}:
            if path.suffix.lower() == '.xlsx':
                with zipfile.ZipFile(path) as archive:
                    if sum(i.file_size for i in archive.infolist()) > settings.max_excel_bytes:
                        raise ValueError('Excel decompression limit exceeded')
            frame = pd.read_excel(path,dtype=str,keep_default_na=False,nrows=settings.max_rows+1)
        else:
            raise ValueError('Only CSV, XLSX and XLS files are supported')
        if len(frame)>settings.max_rows or len(frame.columns)>settings.max_columns:
            raise ValueError('Dataset row or column limit exceeded')
        if frame.empty:
            raise ValueError('Dataset has no data rows')
        if (set(options.column_roles)|set(options.numeric_constraints))-set(frame.columns):
            raise ValueError('Import options refer to unknown columns')
        source = list(range(2,len(frame)+2))
        raw_duplicates = frame.duplicated()
        original_rows = len(frame)
        issues,changes,schema = [],[],[]
        fixed = dict.fromkeys(['whitespace_trimmed','casing_normalized','currency_or_thousands_parsed','null_literals_converted','duplicate_rows_dropped','missing_values_imputed'],0)
        def audit(i,col,raw,reason,change=False):
            (changes if change else issues).append({'row_index':source[i],'column':col,'original_value':raw,'reason':reason})
        for col in frame.columns:
            raw_values = frame[col].tolist()
            nonempty = frame[col][frame[col]!='']
            role = options.column_roles.get(col)
            if role is None:
                if IDENTIFIER.fullmatch(col):
                    role = 'identifier'
                elif DATE_NAME.search(col):
                    role = 'date'
                elif col.lower() in NUMERIC_NAMES:
                    role = 'numeric'
                elif len(nonempty) and nonempty.map(number).notna().all() and not nonempty.str.match(r'^[+-]?0\d').any():
                    role = 'numeric'
                else:
                    role = 'text'
            parsed = []
            invalid_indices = set()
            for i,raw in enumerate(raw_values):
                value = raw if raw!='' else None
                if role == 'numeric':
                    value = number(value)
                    if pd.isna(value):
                        audit(i,col,raw,'Missing or unparseable numeric value')
                        if raw!='':
                            invalid_indices.add(i)
                    elif str(value)!=raw:
                        audit(i,col,raw,'Parsed numeric representation',True)
                        fixed['currency_or_thousands_parsed'] += 1
                elif role == 'date' and value is not None:
                    try:
                        match = re.fullmatch(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})',value)
                        if match and int(match[1])<=12 and int(match[2])<=12 and match[1]!=match[2] and options.date_order=='unresolved':
                            raise ValueError('Ambiguous date')
                        value = pd.to_datetime(value,format='mixed',dayfirst=options.date_order=='dayfirst',errors='raise').isoformat()
                        if value!=raw:
                            audit(i,col,raw,'Parsed date representation',True)
                    except (ValueError,TypeError,OverflowError):
                        value = None
                        audit(i,col,raw,'Invalid or unresolved ambiguous date')
                parsed.append(value)
            frame[col] = parsed
            if role=='numeric':
                frame[col] = pd.to_numeric(frame[col],errors='coerce')
            constraint = options.numeric_constraints.get(col)
            if constraint and role!='numeric':
                raise ValueError('Numeric constraints require a numeric role')
            if constraint and constraint.minimum is not None and constraint.maximum is not None and constraint.minimum>constraint.maximum:
                raise ValueError('Numeric minimum exceeds maximum')
            if constraint:
                for i,value in enumerate(frame[col]):
                    if pd.notna(value) and ((constraint.minimum is not None and value<constraint.minimum) or (constraint.maximum is not None and value>constraint.maximum)):
                        audit(i,col,raw_values[i],'Outside explicit numeric constraint')
            if options.impute and role not in {'identifier','date'}:
                missing = frame[col].isna()
                fill = frame[col].median() if role=='numeric' else (frame[col].mode().iloc[0] if not frame[col].mode().empty else None)
                if pd.notna(fill):
                    for i in np.flatnonzero(missing.to_numpy()):
                        if i not in invalid_indices:
                            audit(i,col,raw_values[i],f'Explicit imputation with {fill}',True)
                            frame.at[i,col] = fill
                            fixed['missing_values_imputed'] += 1
            schema.append({'name':col,'role':role,'dtype':str(frame[col].dtype),'missing_count':int(frame[col].isna().sum()),'missing_pct':round(float(frame[col].isna().mean()*100),2),'imputation_strategy':'explicit' if options.impute else 'none'})
        duplicates = raw_duplicates
        for i in np.flatnonzero(duplicates.to_numpy()):
            audit(i,'*',None,'Duplicate row removed' if options.deduplicate else 'Duplicate row retained',options.deduplicate)
        if options.deduplicate:
            source = [r for r,k in zip(source,~duplicates) if k]
            frame = frame.loc[~duplicates].reset_index(drop=True)
            fixed['duplicate_rows_dropped'] = int(duplicates.sum())
        frame.attrs = {'source_rows':source,'schema':schema,'policy_version':POLICY_VERSION,'numeric_constraints':{k:v.model_dump() for k,v in options.numeric_constraints.items()}}
        self.last_cleaned_df = frame
        health = self._calculate_data_health_score(fixed,issues)
        report = {'auto_fixed':fixed,'flagged_for_review':issues,'changes':changes,'data_health_score':health,'health_score':health['score'],'health_label':health['label']}
        preview = [dict(row,_file_row_number=source[i]) for i,row in enumerate(records(frame.head(10)))]
        return {'summary':{'original_rows':original_rows,'cleaned_rows':len(frame),'columns_count':len(frame.columns),'duplicate_rows_dropped':fixed['duplicate_rows_dropped'],'total_missing_values_filled':fixed['missing_values_imputed']},'shape':list(frame.shape),'columns':schema,'cleaned_preview':preview,'data_quality_report':report,'data_health_score':health,'policy_version':POLICY_VERSION,'cleaning_policy':options.model_dump()}

    def _calculate_data_health_score(self,fixed,issues):
        flagged = len({i['row_index'] for i in issues})
        penalty = min(40,flagged)
        score = 100-penalty
        return {'score':score,'label':'Excellent' if score>80 else 'Good' if score>=60 else 'Needs Review','color':'green' if score>80 else 'amber' if score>=60 else 'red','total_flagged':flagged,'total_auto_fixed':sum(fixed.values()),'penalties':{'flagged_penalty':penalty,'auto_fixed_penalty':0}}
