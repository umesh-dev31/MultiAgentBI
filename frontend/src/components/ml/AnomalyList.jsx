import React from 'react'

export const AnomalyList = ({
  anomalies = [],
  totalEvaluated = 0,
  featuresUsed = [],
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span>Unsupervised Anomaly Detection</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                IsolationForest
              </span>
            </h4>
            <p className="text-xs text-slate-500">
              Evaluated {totalEvaluated} validated transactions across numeric features ({featuresUsed.join(', ')})
            </p>
          </div>
        </div>

        <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold font-mono ${
          anomalies.length > 0
            ? 'bg-rose-50 border border-rose-200 text-rose-700'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          {anomalies.length} {anomalies.length === 1 ? 'anomaly' : 'anomalies'} flagged
        </span>
      </div>

      {/* Cards List */}
      {anomalies.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
          <span className="text-2xl block mb-1">✨</span>
          <p className="font-semibold text-slate-800">Zero Statistical Anomalies Detected</p>
          <p>All validated transactions sit comfortably within normal multidimensional clusters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 pt-1">
          {anomalies.map((anom, idx) => {
            const isHigh = anom.severity === 'High'
            const rec = anom.record || {}
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border bg-white hover:bg-slate-50/50 transition-all shadow-2xs space-y-2.5 border-slate-200 hover:border-rose-300"
              >
                {/* Top card bar: index, severity, score */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] border border-slate-200">
                      Row #{anom.row_index}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        isHigh
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {anom.severity} Deviation
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="text-slate-500 text-[11px]">Anomaly Score:</span>
                    <span className="font-extrabold text-rose-600">
                      {anom.anomaly_score}%
                    </span>
                  </div>
                </div>

                {/* Plain-English explanation banner */}
                <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200/80 text-xs font-semibold text-rose-900 flex items-start gap-2">
                  <span className="text-rose-500 shrink-0 mt-0.5">⚠️</span>
                  <span className="leading-snug">{anom.reason}</span>
                </div>

                {/* Key record attributes chips */}
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600">
                  {rec.product && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-medium">
                      📦 Product: <strong className="text-slate-900">{rec.product}</strong>
                    </span>
                  )}
                  {rec.quantity !== undefined && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-medium font-mono">
                      Qty: <strong className="text-slate-900">{rec.quantity}</strong>
                    </span>
                  )}
                  {rec.unit_price !== undefined && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-medium font-mono">
                      Price: <strong className="text-slate-900">${typeof rec.unit_price === 'number' ? rec.unit_price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : rec.unit_price}</strong>
                    </span>
                  )}
                  {rec.customer_name && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-medium">
                      👤 Customer: <strong className="text-slate-900">{rec.customer_name}</strong>
                    </span>
                  )}
                  {rec.region && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-medium">
                      🗺️ Region: <strong className="text-slate-900">{rec.region}</strong>
                    </span>
                  )}
                  {rec.order_date && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-medium font-mono text-slate-500">
                      📅 {rec.order_date}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
