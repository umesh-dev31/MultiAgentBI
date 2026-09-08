import React from 'react'
import type { NumericColumnStats, StatsComputedOn } from '../../types/data'

interface EDASummarySectionProps {
  numericSummary: Record<string, NumericColumnStats>
  statsComputedOn?: StatsComputedOn
}

export const EDASummarySection: React.FC<EDASummarySectionProps> = ({
  numericSummary,
  statsComputedOn,
}) => {
  const numericCols = Object.keys(numericSummary)

  if (numericCols.length === 0) {
    return null
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Exclusion Banner if rows were filtered out */}
      {statsComputedOn && statsComputedOn.excluded_rows > 0 ? (
        <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 text-amber-900 font-medium">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <span>
              Stats based on <strong className="font-bold text-amber-950">{statsComputedOn.validated_rows_used}</strong> of <strong className="font-bold text-amber-950">{statsComputedOn.total_rows}</strong> validated rows ({statsComputedOn.excluded_rows} excluded: negative values, outliers, or unparseable numbers &mdash; see Data Quality Report above)
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2.5 py-0.5 rounded-md self-start sm:self-auto shadow-2xs">
            Validated Subset
          </span>
        </div>
      ) : statsComputedOn ? (
        <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Stats based on all <strong className="font-bold text-emerald-950">{statsComputedOn.total_rows}</strong> validated rows (0 excluded).
            </span>
          </div>
          <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">
            100% Clean
          </span>
        </div>
      ) : null}

      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900">
            Numeric Summary Statistics
          </h4>
          <p className="text-xs text-slate-500">
            Parametric & non-parametric distribution metrics (mean, std, quartiles)
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
          {numericCols.length} metrics
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-mono text-xs">Column</th>
              <th className="py-3 px-3 text-right">Count</th>
              <th className="py-3 px-3 text-right">Mean</th>
              <th className="py-3 px-3 text-right">Std Dev</th>
              <th className="py-3 px-3 text-right">Min</th>
              <th className="py-3 px-3 text-right">25% (Q1)</th>
              <th className="py-3 px-3 text-right text-indigo-700 font-bold">Median (Q2)</th>
              <th className="py-3 px-3 text-right">75% (Q3)</th>
              <th className="py-3 px-4 text-right">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white font-sans">
            {numericCols.map((col) => {
              const s = numericSummary[col]
              return (
                <tr key={col} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                    {col}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-medium">{s.count}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-bold">{s.mean.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-medium">{s.std.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-bold">{s.min.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-medium">{s.q25.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-700 font-extrabold">{s.median.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-medium">{s.q75.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-bold">{s.max.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
