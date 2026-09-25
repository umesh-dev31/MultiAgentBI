import React, { useState } from 'react'

export const QueryResult = ({
  resultData,
  loading = false,
  error = null,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopySql = () => {
    if (!resultData?.generated_sql) return
    navigator.clipboard.writeText(resultData.generated_sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 1. Loading State
  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <span className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <div>
          <h4 className="font-bold text-sm sm:text-base text-slate-900">
            Synthesizing SQL & Querying Database...
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Validating schema, generating safe SQLite SELECT statement, and filtering business outliers.
          </p>
        </div>
      </div>
    )
  }

  // 2. Error State
  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-rose-900">
              Query Execution Alert
            </h4>
            <p className="text-xs text-rose-700 mt-1 font-medium leading-relaxed">
              {error}
            </p>
            <p className="text-[11px] text-rose-600/80 mt-2">
              Note: The SQL Agent attempted automatic self-correction retry, but the query could not be resolved against the database schema. Try rephrasing your question or picking one of the suggested examples above.
            </p>
          </div>
        </div>

        {resultData?.generated_sql && (
          <div className="mt-3 pt-3 border-t border-rose-200/70">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
              Attempted SQL:
            </span>
            <pre className="p-3 bg-white rounded-lg border border-rose-200 text-xs font-mono text-rose-900 overflow-x-auto">
              {resultData.generated_sql}
            </pre>
          </div>
        )}
      </div>
    )
  }

  // 3. Empty State (No query run yet)
  if (!resultData) {
    return null
  }

  const { question, generated_sql, result, row_count } = resultData
  const columns = result && result.length > 0 ? Object.keys(result[0]) : []

  return (
    <div className="space-y-6">
      {/* Generated SQL Code Block */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-xs font-mono font-semibold text-slate-400 ml-2">
              Generated SQLite Query
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} style={{ flexShrink: 0, display: 'inline', verticalAlign: 'middle' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {' '}Validated SELECT
            </span>
            <button
              onClick={handleCopySql}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Copy SQL to clipboard"
            >
              {copied ? (
                <>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} className="text-emerald-400" style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-x-auto font-mono text-xs sm:text-sm text-indigo-200 leading-relaxed bg-slate-900/90">
          <code>{generated_sql || '-- No SQL generated'}</code>
        </div>
      </div>

      {/* Query Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span>Query Results</span>
              <span className="text-xs font-normal text-slate-500">
                ("{question}")
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Evaluated on the validated subset (zero outlier or negative contamination)
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold font-mono">
            {row_count} {row_count === 1 ? 'row' : 'rows'} returned
          </span>
        </div>

        {columns.length === 0 || row_count === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-1">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.35 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="font-semibold text-slate-700">No records found</p>
            <p>The query executed successfully but matched zero rows in the dataset.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse text-xs">
              <thead
                className="sticky top-0 z-10 border-b backdrop-blur-xs"
                style={{
                  background: 'var(--bg-surface2)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <tr>
                  <th
                    className="py-2.5 px-4 font-bold uppercase tracking-wider text-[10px] w-12 text-center border-r"
                    style={{
                      color: 'var(--text-muted)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="py-2.5 px-4 font-bold tracking-wide text-xs uppercase"
                      style={{
                        color: 'var(--text-primary)',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                {result.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-indigo-50/40 transition-colors odd:bg-white even:bg-slate-50/40"
                  >
                    <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-400 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    {columns.map((col) => {
                      const val = row[col]
                      const isNum = typeof val === 'number'
                      return (
                        <td
                          key={col}
                          className={`py-2.5 px-4 ${
                            isNum ? 'font-mono text-slate-900 font-semibold' : ''
                          }`}
                        >
                          {val === null || val === undefined ? (
                            <span className="text-slate-400 italic">null</span>
                          ) : isNum ? (
                            val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          ) : (
                            String(val)
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
