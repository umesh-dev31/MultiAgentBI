import React, { useCallback, useEffect, useState } from 'react'
import { ExecutiveSummary } from './ExecutiveSummary'
import { SuggestedCharts } from './SuggestedCharts'
import { DataHealthScoreGauge } from '../DataHealthScoreGauge'

/**
  * @param {{
  *   backendUrl: string,
  *   disabled?: boolean,
  *   hasData?: boolean,
  *   initialData?: any,
  *   dataHealthScore?: any
  * }} props
  */
export const BusinessSummaryView = ({
  backendUrl,
  disabled = false,
  hasData = false,
  initialData = null,
  dataHealthScore = undefined,
}) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(initialData)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (initialData) {
      setData(initialData)
    }
  }, [initialData])

  const fetchInsights = useCallback(async () => {
    if (disabled || !hasData) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${backendUrl}/api/insights`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to compute business summary and visualizations.')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating insights.')
    } finally {
      setLoading(false)
    }
  }, [backendUrl, disabled, hasData])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Executive Business Summary & Visualizations</span>
            <span className="text-xs font-normal text-slate-500">
              (Synthesis of EDA, SQL & ML Agents)
            </span>
          </h3>
          <p className="text-xs text-slate-600">
            Autonomous end-to-end intelligence: LLM-grounded managerial briefing with dynamically curated chart specs.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {dataHealthScore && (
            <DataHealthScoreGauge healthScore={dataHealthScore} size="small" />
          )}
          <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-2xs">
            Visualization & Insight Agents
          </span>
          <button
            onClick={fetchInsights}
            disabled={loading || disabled}
            className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Refresh business insights"
          >
            {loading ? 'Synthesizing...' : '↻ Refresh Insights'}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-2xs">
          <span className="text-lg">⚠️</span>
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wide text-rose-900">
              Insight Generation Error
            </h5>
            <p className="text-xs font-medium mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <h4 className="font-bold text-sm text-slate-800">
            Synthesizing Business Insights & Visualizations...
          </h4>
          <p className="text-xs text-slate-500 max-w-md">
            The Visualization Agent is identifying optimal chart specs, while the Insight Agent evaluates statistical patterns and machine learning anomalies with Claude.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && data && (
        <div className="space-y-6">
          {/* 1. Executive Summary & Strategic Callouts */}
          <ExecutiveSummary
            summary={data.summary}
            keyFinding={data.key_finding}
            recommendation={data.recommendation}
            dataHealthScore={dataHealthScore}
          />

          {/* 2. Suggested Charts (Generic Recharts Renderer) */}
          <SuggestedCharts charts={data.charts || []} />
        </div>
      )}
    </div>
  )
}
