import React, { useState } from 'react'
import type { DataQualityReport } from '../types/data'

interface DataQualityReportViewProps {
  report: DataQualityReport
}

export const DataQualityReportView: React.FC<DataQualityReportViewProps> = ({
  report,
}) => {
  const { auto_fixed, flagged_for_review } = report
  const [filterColumn, setFilterColumn] = useState<string>('all')

  const totalAutoFixed =
    auto_fixed.whitespace_trimmed +
    auto_fixed.casing_normalized +
    auto_fixed.currency_or_thousands_parsed +
    auto_fixed.null_literals_converted +
    auto_fixed.duplicate_rows_dropped +
    auto_fixed.missing_values_imputed

  const flaggedColumns = Array.from(
    new Set(flagged_for_review.map((item) => item.column))
  )

  const filteredFlagged =
    filterColumn === 'all'
      ? flagged_for_review
      : flagged_for_review.filter((item) => item.column === filterColumn)

  return (
    <div className="w-full space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>Data Quality & Audit Report</span>
            <span className="text-xs font-normal text-slate-400">
              (Transparent Cleaning Pipeline)
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Categorized breakdown of verified automatic transformations vs. items flagged for manual review
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
            {totalAutoFixed} Auto-fixes Applied
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
            {flagged_for_review.length} Flagged for Review
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL 1: GREEN SAFE AUTO-FIXES (5 cols on large screens) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-5 shadow-xl shadow-emerald-950/20 backdrop-blur-md flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-emerald-300 text-sm sm:text-base">
                  Safe Auto-Fixes Applied
                </h4>
                <p className="text-xs text-slate-400">
                  Deterministic, non-lossy corrections applied automatically
                </p>
              </div>
            </div>

            {/* List of Auto-Fix Metrics */}
            <div className="space-y-2.5">
              {/* Whitespace Trimmed */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Whitespace Trimmed</span>
                </div>
                <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {auto_fixed.whitespace_trimmed} cells
                </span>
              </div>

              {/* Casing Normalized */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Casing Normalized (Title Case)</span>
                </div>
                <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {auto_fixed.casing_normalized} values
                </span>
              </div>

              {/* Currency & Thousands Parsed */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Currency & Thousands Parsed</span>
                </div>
                <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {auto_fixed.currency_or_thousands_parsed} cells
                </span>
              </div>

              {/* Literal Nulls Standardized */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Null Literals ("NaN", "N/A", "none")</span>
                </div>
                <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {auto_fixed.null_literals_converted} converted
                </span>
              </div>

              {/* Duplicate Rows Dropped */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Exact Duplicate Rows Dropped</span>
                </div>
                <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {auto_fixed.duplicate_rows_dropped} rows
                </span>
              </div>

              {/* Missing Values Imputed */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Natural Missing Values Imputed</span>
                </div>
                <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {auto_fixed.missing_values_imputed} values
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Customer names & cities preserved as-is</span>
            <span className="text-emerald-400 font-medium">Safe & Verified</span>
          </div>
        </div>

        {/* PANEL 2: AMBER/RED FLAGGED ISSUES (7 cols on large screens) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 shadow-xl shadow-amber-950/20 backdrop-blur-md flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-amber-300 text-sm sm:text-base flex items-center gap-2">
                    <span>Flagged for Human Review</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {flagged_for_review.length}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ambiguous, impossible, or outlier values left untouched for inspection
                  </p>
                </div>
              </div>

              {/* Column Filter Dropdown if multiple columns flagged */}
              {flaggedColumns.length > 1 && (
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="text-xs text-slate-400">Filter:</span>
                  <select
                    value={filterColumn}
                    onChange={(e) => setFilterColumn(e.target.value)}
                    className="text-xs bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 outline-none focus:border-amber-500"
                  >
                    <option value="all">All Columns ({flagged_for_review.length})</option>
                    {flaggedColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* List or Table of Flagged Items */}
            {flagged_for_review.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-300">Clean dataset! No suspicious issues detected.</p>
                <p className="text-xs text-slate-500 mt-1">All dates, numbers, and categories parsed deterministically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[310px] scrollbar-thin scrollbar-thumb-slate-700 rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400 font-medium z-10">
                    <tr className="border-b border-slate-800">
                      <th className="py-2.5 px-3 w-14 text-center">Row</th>
                      <th className="py-2.5 px-3">Column</th>
                      <th className="py-2.5 px-3">Original Value</th>
                      <th className="py-2.5 px-3">Reason / Human Decision Needed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredFlagged.map((item, index) => {
                      const isNegative = item.reason.toLowerCase().includes('negative')
                      const isOutlier = item.reason.toLowerCase().includes('outlier')
                      const isDate = item.reason.toLowerCase().includes('date')

                      return (
                        <tr
                          key={index}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-2 px-3 text-center font-mono font-medium text-amber-400 bg-slate-950/40">
                            #{item.row_index}
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-slate-200">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                              {item.column}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">
                            <span className="px-1.5 py-0.5 rounded text-rose-300 bg-rose-950/40 border border-rose-500/30">
                              {item.original_value === null
                                ? 'null'
                                : String(item.original_value)}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isNegative
                                    ? 'bg-rose-400'
                                    : isOutlier
                                    ? 'bg-amber-400'
                                    : isDate
                                    ? 'bg-purple-400'
                                    : 'bg-amber-400'
                                }`}
                              />
                              <span className="text-slate-300 text-[11px]">
                                {item.reason}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Unparseable values left as null; outliers & negatives preserved</span>
            <span className="text-amber-400 font-medium">No Data Guessed</span>
          </div>
        </div>
      </div>
    </div>
  )
}
