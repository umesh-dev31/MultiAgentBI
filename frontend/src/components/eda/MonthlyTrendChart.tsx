import React from 'react'
import type { MonthlyTrendData } from '../../types/data'

interface MonthlyTrendChartProps {
  monthlyTrend: MonthlyTrendData[]
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ monthlyTrend }) => {
  const maxRevenue = Math.max(...monthlyTrend.map((m) => m.total_revenue), 1)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">
              Monthly Trend Analysis
            </h4>
            <p className="text-xs text-slate-500">
              Revenue volume & order counts aggregated by month
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {monthlyTrend.length} periods
          </span>
        </div>

        {monthlyTrend.length > 0 ? (
          <div className="space-y-3 pt-1">
            {monthlyTrend.map((m) => {
              const revWidth = Math.max(8, Math.round((m.total_revenue / maxRevenue) * 100))
              return (
                <div key={m.month} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">{m.month}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 text-xs font-medium">
                        {m.total_orders} {m.total_orders === 1 ? 'order' : 'orders'}
                      </span>
                      <span className="font-mono font-extrabold text-emerald-700 text-xs">
                        ${m.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Visual Bar for Revenue */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{ width: `${revWidth}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            No temporal date column detected to plot monthly trends.
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Revenue = Unit Price &times; Quantity (or total amount)</span>
        <span className="text-emerald-700 font-semibold">Auto-Aggregated</span>
      </div>
    </div>
  )
}
