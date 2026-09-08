import React, { useState } from 'react'
import type { DataQualityReport as DataQualityReportType } from '../../types/data'

interface DataQualityReportProps {
  report: DataQualityReportType
}

export const DataQualityReport: React.FC<DataQualityReportProps> = ({ report }) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Data Quality & Audit Report</span>
            <span className="text-xs font-normal text-slate-500">
              (Transparent Cleaning Pipeline)
            </span>
          </h3>
          <p className="text-xs text-slate-600">
            Categorized audit of verified automatic transformations vs. items flagged for manual human inspection
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold shadow-xs">
            {totalAutoFixed} Auto-fixes Applied
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold shadow-xs">
            {flagged_for_review.length} Flagged for Review
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL 1: SAFE AUTO-FIXES (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-xs">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm sm:text-base">
                  Safe Auto-Fixes Applied
                </h4>
                <p className="text-xs text-slate-500">
                  Deterministic, non-lossy corrections applied automatically
                </p>
              </div>
            </div>

            {/* List of Auto-Fix Metrics */}
            <div className="space-y-2.5">
              {/* Whitespace Trimmed */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Whitespace Trimmed</span>
                </div>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {auto_fixed.whitespace_trimmed} cells
                </span>
              </div>

              {/* Casing Normalized */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Casing Normalized (Title Case)</span>
                </div>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {auto_fixed.casing_normalized} values
                </span>
              </div>

              {/* Currency & Thousands Parsed */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Currency & Thousands Parsed</span>
                </div>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {auto_fixed.currency_or_thousands_parsed} cells
                </span>
              </div>

              {/* Null Literals Standardized */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Literal Null Strings Standardized</span>
                </div>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {auto_fixed.null_literals_converted} literals
                </span>
              </div>

              {/* Duplicate Rows Dropped */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Exact Duplicate Rows Dropped</span>
                </div>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {auto_fixed.duplicate_rows_dropped} rows
                </span>
              </div>

              {/* Missing Values Imputed */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Natural Missing Values Imputed</span>
                </div>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {auto_fixed.missing_values_imputed} values
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Customer names & cities preserved as-is</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              ✓ Safe & Verified
            </span>
          </div>
        </div>

        {/* PANEL 2: FLAGGED FOR HUMAN REVIEW (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-amber-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-xs">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 text-sm sm:text-base">
                      Flagged for Human Review
                    </h4>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      {flagged_for_review.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Ambiguous, impossible, or outlier values left untouched for inspection
                  </p>
                </div>
              </div>

              {/* Column Filter Dropdown */}
              {flaggedColumns.length > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="col-filter" className="text-xs text-slate-500 font-medium">
                    Filter:
                  </label>
                  <select
                    id="col-filter"
                    value={filterColumn}
                    onChange={(e) => setFilterColumn(e.target.value)}
                    className="text-xs rounded-lg bg-slate-50 border border-slate-300 text-slate-800 py-1.5 px-2.5 focus:outline-hidden focus:border-indigo-600 cursor-pointer font-medium"
                  >
                    <option value="all">All Columns ({flagged_for_review.length})</option>
                    {flaggedColumns.map((col) => {
                      const count = flagged_for_review.filter((i) => i.column === col).length
                      return (
                        <option key={col} value={col}>
                          {col} ({count})
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Flagged Items Table */}
            {filteredFlagged.length > 0 ? (
              <div className="overflow-x-auto max-h-[340px] overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Column</th>
                      <th className="py-2.5 px-3">Original Value</th>
                      <th className="py-2.5 px-3">Reason / Human Decision Needed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredFlagged.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                          #{item.row_index}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {item.column}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                          <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
                            {item.original_value === null ? 'null' : String(item.original_value)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{item.reason}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No items flagged for review in this column.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Unparseable values left as null; outliers & negatives preserved</span>
            <span className="text-amber-700 font-semibold">No Data Guessed</span>
          </div>
        </div>
      </div>
    </div>
  )
}
