import React from 'react'

export const QueryInput = ({
  question,
  setQuestion,
  onSubmit,
  loading = false,
  disabled = false,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!question || !question.trim() || loading || disabled) return
    onSubmit(question.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-700">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              Natural Language SQL Query
            </h3>
            <p className="text-xs text-slate-500">
              Ask questions in plain English &bull; Powered by autonomous text-to-SQL
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hidden sm:inline-block">
          Target: orders table
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 pt-1">
        <div className="relative flex-1">
          <input
            id="sql-question-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            placeholder="e.g., What is the total revenue by region? or Top 5 customers by order count..."
            className="w-full pl-4 pr-10 py-3 text-sm font-medium rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-inner disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          {question && !loading && (
            <button
              type="button"
              onClick={() => setQuestion('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md text-xs transition"
              title="Clear input"
            >
              ✕
            </button>
          )}
        </div>

        <button
          id="sql-submit-button"
          type="submit"
          disabled={!question || !question.trim() || loading || disabled}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Running SQL Agent...</span>
            </>
          ) : (
            <>
              <span>Run Query</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
