import React from 'react'

export const ForecastChart = ({ forecastData }) => {
  if (!forecastData) {
    return null
  }

  const {
    historical = [],
    forecast = [],
    confidence_level = 'none',
    confidence_note = '',
    trend_direction = '',
  } = forecastData

  const isInsufficient = confidence_level === 'insufficient' || confidence_level === 'none'
  const isLowConfidence = confidence_level === 'low'

  // Combine points for continuous line plotting
  const allPoints = [
    ...historical.map((h, i) => ({
      period: h.period,
      revenue: h.revenue,
      orders: h.orders,
      isForecast: false,
      index: i,
    })),
    ...forecast.map((f, i) => ({
      period: f.period,
      revenue: f.predicted_value,
      orders: f.predicted_orders,
      isForecast: true,
      index: historical.length + i,
    })),
  ]

  // Chart dimensions & scaling
  const width = 680
  const height = 240
  const padLeft = 65
  const padRight = 35
  const padTop = 25
  const padBottom = 35

  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const maxVal = Math.max(...allPoints.map((p) => p.revenue), 100)
  const minVal = 0

  const getX = (idx) => {
    if (allPoints.length <= 1) return padLeft + plotW / 2
    return padLeft + (idx / (allPoints.length - 1)) * plotW
  }

  const getY = (val) => {
    return padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH
  }

  // Create paths:
  // 1. Historical line (solid)
  let histPath = ''
  if (historical.length > 0) {
    histPath = historical
      .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)},${getY(h.revenue).toFixed(1)}`)
      .join(' ')
  }

  // 2. Forecast line (dashed) connecting last historical point to forecast points
  let forecastPath = ''
  if (forecast.length > 0 && historical.length > 0) {
    const lastHistIdx = historical.length - 1
    const lastHist = historical[lastHistIdx]
    const pts = [
      `M ${getX(lastHistIdx).toFixed(1)},${getY(lastHist.revenue).toFixed(1)}`,
      ...forecast.map(
        (f, i) => `L ${getX(historical.length + i).toFixed(1)},${getY(f.predicted_value).toFixed(1)}`
      ),
    ]
    forecastPath = pts.join(' ')
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span>Trend Forecasting & Projections</span>
              {trend_direction && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {trend_direction}
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500">
              Aggregated monthly revenue trajectory with 3-month forward projection
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-indigo-600 rounded-full" />
            <span className="text-slate-700">Historical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-b-2 border-dashed border-teal-500" />
            <span className="text-teal-700 font-semibold">Forecast (Dashed)</span>
          </div>
        </div>
      </div>

      {/* Honest Confidence Warning Banner */}
      {isLowConfidence && (
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-2.5 shadow-2xs">
          <span className="text-amber-500 text-base shrink-0 mt-0.5">⚠️</span>
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wide text-amber-800">
              Limited Historical Baseline Notice
            </h5>
            <p className="text-xs font-medium mt-0.5 text-amber-900/90 leading-relaxed">
              {confidence_note}
            </p>
          </div>
        </div>
      )}

      {/* Insufficient Data State */}
      {isInsufficient ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
          <span className="text-2xl block mb-1">📉</span>
          <p className="font-semibold text-slate-800">
            Cannot Generate Multi-Month Trend Forecast
          </p>
          <p className="max-w-md mx-auto leading-relaxed">
            {confidence_note || 'At least 2 distinct monthly periods are required to project linear revenue trajectory.'}
          </p>
          {historical.length === 1 && (
            <div className="inline-block mt-2 px-3 py-1 rounded-lg bg-white border border-slate-200 font-mono text-slate-700 font-medium">
              Available: <strong>{historical[0].period}</strong> (${historical[0].revenue.toLocaleString()})
            </div>
          )}
        </div>
      ) : (
        /* SVG Line Chart */
        <div className="space-y-4">
          <div className="w-full overflow-x-auto bg-slate-50/60 p-2 rounded-xl border border-slate-200">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto min-w-[500px] select-none"
            >
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const yPos = padTop + plotH * (1 - ratio)
                const gridVal = minVal + ratio * (maxVal - minVal)
                return (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      y1={yPos}
                      x2={width - padRight}
                      y2={yPos}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      strokeDasharray={i === 0 ? 'none' : '3,3'}
                    />
                    <text
                      x={padLeft - 8}
                      y={yPos + 4}
                      textAnchor="end"
                      fontSize="10"
                      className="fill-slate-400 font-mono"
                    >
                      ${Math.round(gridVal / 1000)}k
                    </text>
                  </g>
                )
              })}

              {/* Forecast Area Boundary Shading */}
              {historical.length > 0 && forecast.length > 0 && (
                <rect
                  x={getX(historical.length - 1)}
                  y={padTop}
                  width={width - padRight - getX(historical.length - 1)}
                  height={plotH}
                  fill="#0d9488"
                  fillOpacity="0.05"
                />
              )}

              {/* Solid Historical Path */}
              {histPath && (
                <path
                  d={histPath}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Dashed Forecast Path */}
              {forecastPath && (
                <path
                  d={forecastPath}
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="2.5"
                  strokeDasharray="5,5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {allPoints.map((p, i) => {
                const cx = getX(i)
                const cy = getY(p.revenue)
                return (
                  <g key={i}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={p.isForecast ? 4.5 : 4}
                      className={
                        p.isForecast
                          ? 'fill-white stroke-teal-600 stroke-2'
                          : 'fill-indigo-600 stroke-white stroke-2'
                      }
                    />
                    {/* Period Label */}
                    <text
                      x={cx}
                      y={height - padBottom + 16}
                      textAnchor="middle"
                      fontSize="10"
                      className={`font-mono ${
                        p.isForecast ? 'fill-teal-700 font-bold' : 'fill-slate-600'
                      }`}
                    >
                      {p.period}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Forecast Horizon Cards */}
          {forecast.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Projected Monthly Trajectory
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {forecast.map((f, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-teal-900">{f.period}</span>
                      <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-100/80 px-2 py-0.2 rounded-full">
                        Projected
                      </span>
                    </div>
                    <div className="text-base font-extrabold font-mono text-teal-800">
                      ${f.predicted_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Est. {f.predicted_orders} {f.predicted_orders === 1 ? 'order' : 'orders'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
