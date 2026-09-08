import React from 'react'
import type { ColumnInfo } from '../types/data'

interface SchemaTableProps {
  columns: ColumnInfo[]
}

export const SchemaTable: React.FC<SchemaTableProps> = ({ columns }) => {
  const getDtypeBadgeClass = (dtype: string) => {
    const d = dtype.toLowerCase()
    if (d.includes('int')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    }
    if (d.includes('float')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
    }
    if (d.includes('bool')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
    }
    if (d.includes('date') || d.includes('time')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    }
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  }

  return (
    <div className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-200">
            Schema & Missing Value Analysis
          </h3>
          <p className="text-xs text-slate-400">
            Inferred data types and missing value distribution per column
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          {columns.length} columns
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-medium">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Column Name</th>
              <th className="py-3 px-4">Inferred Dtype</th>
              <th className="py-3 px-4">Missing Values</th>
              <th className="py-3 px-4">Imputation Strategy</th>
              <th className="py-3 px-4 text-right">Missing %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {columns.map((col, index) => {
              const hasMissing = col.missing_pct > 0
              return (
                <tr
                  key={col.name}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-center font-mono text-slate-500 text-xs">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-200">
                    {col.name}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${getDtypeBadgeClass(
                        col.dtype
                      )}`}
                    >
                      {col.dtype}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-20 sm:w-28 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            hasMissing ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(col.missing_pct, 100)}%` }}
                        />
                      </div>
                      {col.missing_count !== undefined && (
                        <span className="text-xs text-slate-400 font-mono">
                          {col.missing_count} nulls
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {col.imputation_strategy && col.imputation_strategy !== 'none' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {col.imputation_strategy}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs font-mono">none</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span
                      className={`font-semibold ${
                        hasMissing ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {col.missing_pct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
