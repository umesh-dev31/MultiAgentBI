import React, { useState } from 'react'
import { QueryInput } from './QueryInput'
import { ExampleQuestions } from './ExampleQuestions'
import { QueryResult } from './QueryResult'

/**
 * @param {{
 *   backendUrl: string,
 *   disabled?: boolean,
 *   suggestedQuestions?: any[] | null
 * }} props
 */
export const AskQuestionView = ({
  backendUrl,
  disabled = false,
  suggestedQuestions = null,
}) => {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultData, setResultData] = useState(null)
  const [queryError, setQueryError] = useState(null)

  const handleRunQuery = async (queryText) => {
    const q = queryText || question
    if (!q || !q.trim() || loading || disabled) return

    setLoading(true)
    setQueryError(null)

    try {
      const response = await fetch(`${backendUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: q.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to execute query.')
      }

      setResultData(data)
      if (data.error) {
        setQueryError(data.error)
      }
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectExample = (exampleText) => {
    setQuestion(exampleText)
    handleRunQuery(exampleText)
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Natural Language Business Intelligence</span>
            <span className="text-xs font-normal text-slate-500">
              (Autonomous Text-to-SQL Agent)
            </span>
          </h3>
          <p className="text-xs text-slate-600">
            Ask questions in plain English to automatically synthesize, validate, and execute SQLite queries on the cleaned dataset.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
            SQL Agent Active
          </span>
        </div>
      </div>

      {/* 1. Natural Language Query Input */}
      <QueryInput
        question={question}
        setQuestion={setQuestion}
        onSubmit={handleRunQuery}
        loading={loading}
        disabled={disabled}
      />

      {/* 2. Example Questions Chips */}
      <ExampleQuestions
        onSelectQuestion={handleSelectExample}
        disabled={disabled || loading}
        backendUrl={backendUrl}
        initialQuestions={suggestedQuestions}
      />

      {/* 3. Query Results (Code Block + Results Table) or Error / Loading */}
      <QueryResult
        resultData={resultData}
        loading={loading}
        error={queryError}
      />
    </div>
  )
}
