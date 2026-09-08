import React from 'react'
import type { DataSummary } from '../types/data'

interface DatasetSummaryProps {
  summary: DataSummary
  shape: [number, number]
  fileName?: string
  onReset: () => void
}

export const DatasetSummary: React.FC<DatasetSummaryProps> = ({
  summary,
  shape,
  fileName,
  onReset,
}) => {
  const [rows, cols] = shape

  return (
    <div className="w-full space-y-4">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {fileName || 'Processed Dataset'}
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                Cleaned
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Processed by DataAgent &bull; Ready for exploratory analysis
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Another Dataset
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Dimensions */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>Dimensions (Shape)</span>
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
            {rows} <span className="text-sm font-normal text-slate-500">&times;</span> {cols}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {summary.original_rows !== rows ? (
              <span>Down from {summary.original_rows} original rows</span>
            ) : (
              <span>{rows} rows &bull; {cols} columns</span>
            )}
          </div>
        </div>

        {/* Columns Count */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>Attributes / Columns</span>
            <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
            {summary.columns_count}
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1">
            Schema types inferred
          </div>
        </div>

        {/* Duplicates Dropped */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>Duplicates Dropped</span>
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
            {summary.duplicate_rows_dropped}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {summary.duplicate_rows_dropped > 0 ? (
              <span className="text-amber-700 font-semibold">Exact duplicates removed</span>
            ) : (
              <span>No duplicates found</span>
            )}
          </div>
        </div>

        {/* Missing Imputed */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>Missing Imputed</span>
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
            {summary.total_missing_values_filled}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {summary.total_missing_values_filled > 0 ? (
              <span className="text-emerald-700 font-semibold">Values filled</span>
            ) : (
              <span>No missing values filled</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
