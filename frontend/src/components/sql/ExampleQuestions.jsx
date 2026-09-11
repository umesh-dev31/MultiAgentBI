import React, { useEffect, useState, useCallback } from 'react'

const DEFAULT_FALLBACKS = [
  {
    title: 'Show me the first 10 rows',
    description: 'Displays initial 10 records from the active table',
    icon: '📋',
  },
  {
    title: 'What is the total number of records?',
    description: 'Counts total rows loaded in the current dataset',
    icon: '🔢',
  },
  {
    title: 'What are the column summary statistics?',
    description: 'Computes aggregate ranges and distribution metrics',
    icon: '📊',
  },
  {
    title: 'Find any records with missing values',
    description: 'Scans columns for null or unpopulated entries',
    icon: '🔍',
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
            <span>↻</span>
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
                <span className="text-base group-hover:scale-110 transition-transform">
                  {ex.icon || '📊'}
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
