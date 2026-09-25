import React, { useEffect, useState, useCallback } from 'react'

const ICON_LIST = (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)
const ICON_COUNT = (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
)
const ICON_CHART = (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)
const ICON_SEARCH = (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const DEFAULT_FALLBACKS = [
  {
    title: 'Show me the first 10 rows',
    description: 'Displays initial 10 records from the active table',
    icon: ICON_LIST,
  },
  {
    title: 'What is the total number of records?',
    description: 'Counts total rows loaded in the current dataset',
    icon: ICON_COUNT,
  },
  {
    title: 'What are the column summary statistics?',
    description: 'Computes aggregate ranges and distribution metrics',
    icon: ICON_CHART,
  },
  {
    title: 'Find any records with missing values',
    description: 'Scans columns for null or unpopulated entries',
    icon: ICON_SEARCH,
  },
]

export const ExampleQuestions = ({
  onSelectQuestion,
  disabled = false,
  backendUrl = 'http://localhost:8000',
  initialQuestions = null,
}) => {
  const [questions, setQuestions] = useState(
    initialQuestions && initialQuestions.length > 0 ? initialQuestions : []
  )
  const [loading, setLoading] = useState(
    !initialQuestions || initialQuestions.length === 0
  )

  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions)
      setLoading(false)
    }
  }, [initialQuestions])

  const fetchQuestions = useCallback(async (refresh = false) => {
    setLoading(true)
    try {
      const url = `${backendUrl}/api/suggested-questions${refresh ? '?refresh=true' : ''}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions)
      } else {
        setQuestions(DEFAULT_FALLBACKS)
      }
    } catch {
      setQuestions(DEFAULT_FALLBACKS)
    } finally {
      setLoading(false)
    }
  }, [backendUrl])

  useEffect(() => {
    if (!initialQuestions || initialQuestions.length === 0) {
      fetchQuestions(false)
    }
  }, [fetchQuestions, initialQuestions])

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>Suggested Business Questions</span>
          <span className="text-[10px] font-normal text-slate-400 capitalize">
            (tailored to current schema)
          </span>
        </div>

        {!loading && (
          <button
            type="button"
            onClick={() => fetchQuestions(true)}
            disabled={disabled || loading}
            className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
            title="Generate new suggestions"
          >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
            <span>Refresh</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-white border border-slate-200 animate-pulse space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-slate-200 rounded" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
              <div className="h-2.5 bg-slate-100 rounded w-full" />
              <div className="h-2 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {questions.map((ex, index) => (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => onSelectQuestion(ex.title)}
              className="flex flex-col text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group shadow-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center text-slate-500 group-hover:scale-110 transition-transform">
                  {ex.icon || ICON_CHART}
                </span>
                <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {ex.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                {ex.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
