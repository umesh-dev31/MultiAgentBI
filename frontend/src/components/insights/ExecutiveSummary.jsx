import React, { useState } from 'react'
import { DataHealthScoreGauge } from '../DataHealthScoreGauge'

export const ExecutiveSummary = ({ summary, keyFinding, recommendation, dataHealthScore }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const textToCopy = `EXECUTIVE SUMMARY:\n${summary}\n\nKEY FINDING:\n${keyFinding}\n\nRECOMMENDATION:\n${recommendation}`
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center text-lg shadow-sm">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Executive Business Summary
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Insight Agent
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Plain-language strategic analysis powered by autonomous cross-agent synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {dataHealthScore && (
            <DataHealthScoreGauge healthScore={dataHealthScore} size="small" />
          )}
          <button
            onClick={handleCopy}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            {copied ? (
              <>
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="text-emerald-700">Copied to Clipboard</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Copy Briefing</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Executive Summary Paragraph */}
      <div className="relative p-5 rounded-xl bg-slate-50/80 border border-slate-200/80">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
          <span>Strategic Overview</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        </div>
        <p className="text-sm text-slate-800 leading-relaxed font-normal">
          {summary || 'No executive summary generated.'}
        </p>
      </div>

      {/* Key Finding & Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Key Finding Card */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-200/90 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Key Strategic Finding
              </h4>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
              {keyFinding || 'Awaiting analytical synthesis...'}
            </p>
          </div>
          <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between text-[11px] text-indigo-700 font-medium">
            <span>Critical Metric Anchor</span>
            <span>Verified from Data</span>
          </div>
        </div>

        {/* Actionable Recommendation Card */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border border-emerald-200/90 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Actionable Recommendation
              </h4>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
              {recommendation || 'Awaiting tactical recommendations...'}
            </p>
          </div>
          <div className="pt-2 border-t border-emerald-100/80 flex items-center justify-between text-[11px] text-emerald-700 font-medium">
            <span>Management Action Step</span>
            <span>Immediate Priority</span>
          </div>
        </div>
      </div>
    </div>
  )
}
