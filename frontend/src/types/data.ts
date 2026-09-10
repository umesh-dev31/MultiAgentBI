export interface ColumnInfo {
  name: string
  dtype: string
  missing_pct: number
  missing_count?: number
  imputation_strategy?: string
}

export interface DataSummary {
  original_rows: number
  cleaned_rows: number
  columns_count: number
  duplicate_rows_dropped: number
  total_missing_values_filled: number
}

export type CleanedRecord = Record<string, string | number | boolean | null>

export interface AutoFixedReport {
  whitespace_trimmed: number
  casing_normalized: number
  currency_or_thousands_parsed: number
  null_literals_converted: number
  duplicate_rows_dropped: number
  missing_values_imputed: number
}

export interface FlaggedIssue {
  row_index: number
  column: string
  original_value: string | number | boolean | null
  reason: string
}

export interface DataQualityReport {
  auto_fixed: AutoFixedReport
  flagged_for_review: FlaggedIssue[]
}

export interface NumericColumnStats {
  count: number
  mean: number
  std: number
  median: number
  min: number
  max: number
  q25: number
  q50: number
  q75: number
}

export interface CategoricalValueCount {
  value: string
  count: number
  percentage: number
}

export interface CorrelationMatrixData {
  columns: string[]
  matrix: number[][]
}

export interface MonthlyTrendData {
  month: string
  total_orders: number
  total_revenue: number
}

export interface StatsComputedOn {
  total_rows: number
  validated_rows_used: number
  excluded_rows: number
}

export interface EDAResponse {
  stats_computed_on?: StatsComputedOn
  numeric_summary: Record<string, NumericColumnStats>
  categorical_summary: Record<string, CategoricalValueCount[]>
  correlation_matrix: CorrelationMatrixData
  monthly_trend: MonthlyTrendData[]
  notable_patterns: string[]
}

export interface UploadResponse {
  summary: DataSummary
  shape: [number, number]
  columns: ColumnInfo[]
  cleaned_preview: CleanedRecord[]
  data_quality_report?: DataQualityReport
  eda?: EDAResponse
}

export interface PipelineExecutionLog {
  step_name: string
  duration_seconds: number
  status: 'success' | 'failed'
  details?: any
}

export interface PipelineRunResponse {
  status: string
  filename: string
  dataset_summary: UploadResponse
  data_quality_report: DataQualityReport
  eda_result: EDAResponse
  ml_result: any
  visualization_result: any
  insight_result: any
  suggested_questions: any[]
  execution_logs: PipelineExecutionLog[]
}

