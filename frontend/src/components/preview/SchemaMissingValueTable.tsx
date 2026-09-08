import React from 'react'
import type { ColumnInfo } from '../../types/data'

interface SchemaMissingValueTableProps {
  columns: ColumnInfo[]
}

export const SchemaMissingValueTable: React.FC<SchemaMissingValueTableProps> = ({ columns }) => {
  const getDtypeBadgeClass = (dtype: string) => {
    const d = dtype.toLowerCase()
    if (d.includes('int')) {
      return 'bg-blue-50 text-blue-800 border-blue-200'
    }
    if (d.includes('float')) {
      return 'bg-cyan-50 text-cyan-800 border-cyan-200'
    }
    if (d.includes('bool')) {
      return 'bg-purple-50 text-purple-800 border-purple-200'
    }
    if (d.includes('date') || d.includes('time')) {
      return 'bg-amber-50 text-amber-800 border-amber-200'
    }
    return 'bg-slate-100 text-slate-800 border-slate-200'
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Schema & Missing Value Analysis
          </h3>
          <p className="text-xs text-slate-500">
            Inferred data types, missing distributions, and imputation strategies
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
          {columns.length} columns
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Column Name</th>
              <th className="py-3 px-4">Inferred Dtype</th>
              <th className="py-3 px-4">Missing Distribution</th>
              <th className="py-3 px-4">Imputation Strategy</th>
              <th className="py-3 px-4 text-right">Missing %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {columns.map((col, index) => {
              const hasMissing = col.missing_pct > 0
              return (
                <tr
                  key={col.name}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-3 px-4 text-center font-mono text-slate-400 text-xs">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {col.name}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold border ${getDtypeBadgeClass(
                        col.dtype
                      )}`}
                    >
                      {col.dtype}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-20 sm:w-28 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            hasMissing ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(col.missing_pct, 100)}%` }}
                        />
                      </div>
                      {col.missing_count !== undefined && (
                        <span className="text-xs text-slate-600 font-mono font-medium">
                          {col.missing_count} nulls
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {col.imputation_strategy && col.imputation_strategy !== 'none' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-50 text-indigo-800 border border-indigo-200 font-medium">
                        {col.imputation_strategy}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-mono">none</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    <span
                      className={
                        hasMissing ? 'text-amber-700' : 'text-emerald-700'
                      }
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
