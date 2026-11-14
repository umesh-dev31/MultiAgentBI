from dataclasses import dataclass
from typing import Any, Literal
import pandas as pd
from pydantic import BaseModel, Field

POLICY_VERSION = 'preserve-v1'

class NumericConstraint(BaseModel):
    minimum: float | None = Field(default=None,allow_inf_nan=False)
    maximum: float | None = Field(default=None,allow_inf_nan=False)

class ImportOptions(BaseModel):
    model_config = {'extra':'forbid'}
    impute: bool = False
    deduplicate: bool = False
    date_order: Literal['unresolved', 'dayfirst', 'monthfirst'] = 'unresolved'
    column_roles: dict[str, Literal['identifier', 'text', 'numeric', 'date']] = Field(default_factory=dict)
    numeric_constraints: dict[str, NumericConstraint] = Field(default_factory=dict)

@dataclass(frozen=True)
class DatasetContext:
    dataset_id: int
    frame: pd.DataFrame
    schema: list[dict[str, Any]]
    source_rows: list[int]
    cleaning_policy: dict
    eligibility: dict
    quality_report: dict

def records(frame):
    def scalar(value):
        if pd.isna(value):
            return None
        if hasattr(value,'isoformat'):
            return value.isoformat()
        return value.item() if hasattr(value,'item') else value
    return [{str(key):scalar(value) for key,value in row.items()} for row in frame.to_dict(orient='records')]

def finite_result(value):
    """Fail explicitly on numeric overflow instead of persisting invalid JSON numbers."""
    import json
    json.dumps(value,allow_nan=False)
    return value
