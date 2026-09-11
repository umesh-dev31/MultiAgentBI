import React from 'react'
import type { CategoricalValueCount } from '../../types/data'

interface CategoricalDistributionsProps {
  categoricalSummary: Record<string, CategoricalValueCount[]>
}

export const CategoricalDistributions: React.FC<CategoricalDistributionsProps> = ({
  categoricalSummary,
}) => {
  const categoricalCols = Object.keys(categoricalSummary)

  if (categoricalCols.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900">
            Categorical Distributions (Top 5 Values)
          </h4>
          <p className="text-xs text-slate-500">
            Frequency breakdowns and concentration percentages per categorical column
          </p>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Frequency distribution per category
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoricalCols.map((col) => {
          const items = categoricalSummary[col]
          const distinctCount = items[0]?.total_distinct ?? items.length
          return (
            <div
              key={col}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {col}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {distinctCount} distinct
                  </span>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="truncate max-w-[170px] text-slate-800" title={item.value}>
                          {item.value || '<empty>'}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-slate-700 text-[11px]">
                          <span className="font-bold">{item.count}</span>
                          <span className="text-slate-400">({item.percentage.toFixed(0)}%)</span>
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-300"
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
