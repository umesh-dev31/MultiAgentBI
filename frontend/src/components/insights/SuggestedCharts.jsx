import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const PALETTE = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
]

const formatCurrency = (val) => {
  if (typeof val !== 'number') return val
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`
  return `$${val.toLocaleString()}`
}

const CustomBarTooltip = ({ active, payload, label, yField }) => {
  if (active && payload && payload.length) {
    const rawVal = payload[0].value
    const isMoney = yField.toLowerCase().includes('rev') || yField.toLowerCase().includes('price') || yField.toLowerCase().includes('amount')
    return (
      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700">
        <p className="font-semibold text-slate-300">{label}</p>
        <p className="font-mono font-bold text-indigo-300 mt-0.5">
          {isMoney ? `$${Number(rawVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : rawVal}
        </p>
      </div>
    )
  }
  return null
}

const CustomLineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700 space-y-1">
        <p className="font-semibold text-slate-300">{label}</p>
        {payload.map((item, idx) => (
          <p key={idx} className="font-mono text-xs flex items-center justify-between gap-3">
            <span style={{ color: item.color }}>{item.name}:</span>
            <span className="font-bold text-white">
              {item.name.toLowerCase().includes('rev')
                ? `$${Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : item.value}
            </span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload
    return (
      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700">
        <p className="font-semibold text-slate-300">{item.name}</p>
        <p className="font-mono font-bold text-emerald-300 mt-0.5">
          {item.value} {item.value === 1 ? 'record' : 'records'} ({item.percentage}%)
        </p>
      </div>
    )
  }
  return null
}

export const SuggestedCharts = ({ charts = [] }) => {
  if (!charts || charts.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-xs">
        No suggested charts available for this dataset.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900">
            Recommended Visualizations
          </h4>
          <p className="text-xs text-slate-500">
            Dynamically identified by Visualization Agent to highlight key operational dimensions
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          {charts.length} Charts Generated
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart, idx) => {
          const chartType = (chart.chart_type || '').toLowerCase()
          const data = chart.data || []
          const xField = chart.x_field
          const yField = chart.y_field

          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
            >
              {/* Chart Card Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                    {chart.title}
                  </h5>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {chartType} chart &bull; {data.length} segments
                  </p>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {chartType}
                </span>
              </div>

              {/* Chart Body */}
              <div className="w-full h-64 sm:h-72">
                {chartType === 'bar' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data}
                      margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey={xField}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={formatCurrency}
                      />
                      <Tooltip content={<CustomBarTooltip yField={yField} />} />
                      <Bar
                        dataKey={yField}
                        fill="#4f46e5"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={45}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {chartType === 'line' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data}
                      margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey={xField}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={formatCurrency}
                      />
                      <Tooltip content={<CustomLineTooltip />} />
                      <Line
                        type="monotone"
                        dataKey={yField}
                        name="Revenue"
                        stroke="#059669"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#059669', strokeWidth: 1.5, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                      {chart.secondary_y_field && (
                        <Line
                          type="monotone"
                          dataKey={chart.secondary_y_field}
                          name="Orders"
                          stroke="#6366f1"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 3, fill: '#6366f1' }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {chartType === 'pie' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      />
                      <Pie
                        data={data}
                        dataKey={yField || 'value'}
                        nameKey={xField || 'name'}
                        cx="50%"
                        cy="45%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {data.map((_, entryIdx) => (
                          <Cell
                            key={`cell-${entryIdx}`}
                            fill={PALETTE[entryIdx % PALETTE.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
