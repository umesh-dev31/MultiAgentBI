import React from 'react'
import type { CorrelationMatrixData } from '../../types/data'

interface CorrelationMatrixProps {
  correlationMatrix: CorrelationMatrixData
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  correlationMatrix,
}) => {
  const { columns, matrix } = correlationMatrix

  // Helper for heatmap cell colors in light theme
  const getCorrelationColor = (r: number) => {
    if (r === 1.0) return 'bg-indigo-100 text-indigo-900 font-extrabold border border-indigo-200'
    if (r > 0.6) return 'bg-cyan-100 text-cyan-900 font-bold border border-cyan-200'
    if (r > 0.2) return 'bg-cyan-50 text-cyan-800 font-semibold border border-cyan-100'
    if (r > 0) return 'bg-slate-50 text-slate-700 font-medium'
    if (r < -0.6) return 'bg-rose-100 text-rose-900 font-bold border border-rose-200'
    if (r < -0.2) return 'bg-rose-50 text-rose-800 font-semibold border border-rose-100'
    return 'bg-slate-50 text-slate-500 font-medium'
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">
              Pearson Correlation Matrix
            </h4>
            <p className="text-xs text-slate-500">
              Heatmap grid: cyan = positive (+), rose = inverse (-)
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {columns.length}&times;{columns.length}
          </span>
        </div>

        {columns.length >= 2 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs font-mono text-slate-400"></th>
                  {columns.map((c) => (
                    <th key={c} className="p-2 text-xs font-mono font-bold text-slate-800">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {columns.map((rowCol, rIdx) => (
                  <tr key={rowCol}>
                    <td className="p-2 text-left text-xs font-mono font-bold text-slate-800 whitespace-nowrap">
                      {rowCol}
                    </td>
                    {columns.map((colCol, cIdx) => {
                      const val = matrix[rIdx]?.[cIdx] ?? 0
                      return (
                        <td key={colCol} className="p-1.5 font-mono">
                          <div
                            className={`py-1.5 px-2 rounded-lg text-xs transition-colors shadow-2xs ${getCorrelationColor(
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

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>Range: -1.0 (inverse) to +1.0 (direct)</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded bg-rose-100 border border-rose-300" />
            <span className="text-rose-900">Negative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded bg-cyan-100 border border-cyan-300" />
            <span className="text-cyan-900">Positive</span>
          </div>
        </div>
      </div>
    </div>
  )
}
