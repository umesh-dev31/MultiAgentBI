import React from 'react'
import type { EDAResponse } from '../types/data'

interface ExploratoryAnalysisViewProps {
  eda: EDAResponse | null
  loading?: boolean
}

export const ExploratoryAnalysisView: React.FC<ExploratoryAnalysisViewProps> = ({
  eda,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="w-full p-10 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span className="text-sm font-medium">Computing Exploratory Data Analysis...</span>
      </div>
    )
  }

  if (!eda) {
    return null
  }

  const {
    stats_computed_on,
    numeric_summary,
    categorical_summary,
    correlation_matrix,
    monthly_trend,
    notable_patterns,
  } = eda

  const numericCols = Object.keys(numeric_summary)
  const categoricalCols = Object.keys(categorical_summary)

  // Helper for heatmap cell colors
  const getCorrelationColor = (r: number) => {
    if (r === 1.0) return 'bg-indigo-500/20 text-indigo-200 font-semibold'
    if (r > 0.6) return 'bg-cyan-500/30 text-cyan-200 font-medium'
    if (r > 0.3) return 'bg-cyan-500/15 text-cyan-300'
    if (r > 0) return 'bg-slate-800 text-slate-300'
    if (r < -0.6) return 'bg-rose-500/30 text-rose-200 font-medium'
    if (r < -0.3) return 'bg-rose-500/15 text-rose-300'
    return 'bg-slate-800/80 text-slate-400'
  }

  // Max revenue for trend chart scaling
  const maxRevenue = Math.max(...monthly_trend.map((m) => m.total_revenue), 1)

  return (
    <div className="w-full space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>Exploratory Analysis</span>
            <span className="text-xs font-normal text-slate-400">
              (Statistical Distributions & Correlation Engine)
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Automated statistical summaries, categorical frequencies, correlation heatmap, and monthly revenue trends
          </p>
        </div>
        <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-medium">
          EDA Agent Active
        </span>
      </div>

      {/* 1. NOTABLE PATTERNS (Bulleted highlights at top) */}
      {notable_patterns && notable_patterns.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900/80 to-slate-900/80 border border-indigo-500/30 shadow-xl shadow-indigo-950/20 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-3 text-indigo-300">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-sm sm:text-base text-white">
              Notable Patterns & Key Highlights
            </h4>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-300">
            {notable_patterns.map((pattern, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-indigo-500/40 transition"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{pattern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. NUMERIC SUMMARY TABLE */}
      {numericCols.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
          {/* Exclusion Banner if rows were filtered out */}
          {stats_computed_on && stats_computed_on.excluded_rows > 0 ? (
            <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-200">
                <span className="flex h-2 w-2 relative flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span>
                  Stats based on <strong className="font-semibold text-amber-100">{stats_computed_on.validated_rows_used}</strong> of <strong className="font-semibold text-amber-100">{stats_computed_on.total_rows}</strong> validated rows ({stats_computed_on.excluded_rows} excluded: negative values, outliers, or unparseable numbers &mdash; see Data Quality Report above)
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-300/90 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded self-start sm:self-auto">
                Validated Subset
              </span>
            </div>
          ) : stats_computed_on ? (
            <div className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  Stats based on all <strong className="font-semibold text-emerald-100">{stats_computed_on.total_rows}</strong> validated rows (0 excluded).
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-300/90 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded">
                100% Clean
              </span>
            </div>
          ) : null}

          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-slate-200">
                Numeric Summary Statistics
              </h4>
              <p className="text-xs text-slate-400">
                Parametric & non-parametric distribution metrics (mean, std, quartiles)
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {numericCols.length} metrics
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead className="bg-slate-950/60 text-slate-400 font-medium">
                <tr className="border-b border-slate-800">
                  <th className="py-3 px-4 font-mono">Column</th>
                  <th className="py-3 px-3 text-right">Count</th>
                  <th className="py-3 px-3 text-right">Mean</th>
                  <th className="py-3 px-3 text-right">Std Dev</th>
                  <th className="py-3 px-3 text-right">Min</th>
                  <th className="py-3 px-3 text-right">25% (Q1)</th>
                  <th className="py-3 px-3 text-right text-indigo-300 font-semibold">Median (Q2)</th>
                  <th className="py-3 px-3 text-right">75% (Q3)</th>
                  <th className="py-3 px-4 text-right">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {numericCols.map((col) => {
                  const s = numeric_summary[col]
                  return (
                    <tr key={col} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-200">
                        {col}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">{s.count}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">{s.mean.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">{s.std.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">{s.min.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">{s.q25.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-300 font-semibold">{s.median.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">{s.q75.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-300">{s.max.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CATEGORICAL TOP-VALUES (Horizontal Bar-Style Lists) */}
      {categoricalCols.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm sm:text-base font-semibold text-slate-200">
              Categorical Distributions (Top 5 Values)
            </h4>
            <span className="text-xs text-slate-400">Frequency distribution per category</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoricalCols.map((col) => {
              const items = categorical_summary[col]
              return (
                <div
                  key={col}
                  className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg backdrop-blur-md space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-mono text-xs font-semibold text-slate-200">
                      {col}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {items.find((i) => typeof i.total_distinct === 'number')?.total_distinct ?? items.length} distinct
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 truncate max-w-[140px]" title={item.value}>
                            {item.value}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                        {/* Horizontal Bar */}
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. BOTTOM ROW: CORRELATION HEATMAP & MONTHLY TREND */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CORRELATION MATRIX HEATMAP (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div>
                <h4 className="font-semibold text-slate-200 text-sm sm:text-base">
                  Pearson Correlation Matrix
                </h4>
                <p className="text-xs text-slate-400">
                  Heatmap grid: cyan = positive (+), rose = inverse (-)
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {correlation_matrix.columns.length}&times;{correlation_matrix.columns.length}
              </span>
            </div>

            {correlation_matrix.columns.length >= 2 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs font-mono">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-slate-400 font-sans"></th>
                      {correlation_matrix.columns.map((c) => (
                        <th key={c} className="p-2 text-slate-300 font-medium truncate max-w-[90px]" title={c}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlation_matrix.columns.map((rowCol, rIdx) => (
                      <tr key={rowCol}>
                        <td className="p-2 text-left font-sans text-slate-300 font-medium truncate max-w-[90px]" title={rowCol}>
                          {rowCol}
                        </td>
                        {correlation_matrix.columns.map((colCol, cIdx) => {
                          const val = correlation_matrix.matrix[rIdx][cIdx]
                          return (
                            <td key={colCol} className="p-1">
                              <div
                                className={`py-1.5 px-2 rounded-lg text-xs transition-colors ${getCorrelationColor(
                                  val
                                )}`}
                                title={`${rowCol} vs ${colCol}: ${val}`}
                              >
                                {val.toFixed(2)}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                At least 2 numeric columns are required to compute a correlation matrix.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Range: -1.0 (inverse) to +1.0 (direct)</span>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-500/50" />
              <span>Negative</span>
              <span className="inline-block w-2.5 h-2.5 rounded bg-cyan-500/30 border border-cyan-500/50" />
              <span>Positive</span>
            </div>
          </div>
        </div>

        {/* MONTHLY TREND CHART (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div>
                <h4 className="font-semibold text-slate-200 text-sm sm:text-base">
                  Monthly Trend Analysis
                </h4>
                <p className="text-xs text-slate-400">
                  Revenue volume & order counts grouped by month
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {monthly_trend.length} periods
              </span>
            </div>

            {monthly_trend.length > 0 ? (
              <div className="space-y-3 pt-2">
                {monthly_trend.map((m) => {
                  const revHeight = Math.max(8, Math.round((m.total_revenue / maxRevenue) * 100))
                  return (
                    <div key={m.month} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-200">{m.month}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-[11px]">
                            {m.total_orders} {m.total_orders === 1 ? 'order' : 'orders'}
                          </span>
                          <span className="font-mono font-semibold text-emerald-400">
                            ${m.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar for Revenue */}
                      <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${revHeight}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No temporal date column (e.g. order_date) detected to compute monthly trends.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Revenue = Unit Price &times; Quantity (or total amount)</span>
            <span className="text-emerald-400 font-medium">Auto-Aggregated</span>
          </div>
        </div>
      </div>
    </div>
  )
}
