import React, { useState } from 'react'
import { QueryInput } from './QueryInput'
import { ExampleQuestions } from './ExampleQuestions'
import { QueryResult } from './QueryResult'

/**
 * @param {{
 *   backendUrl: string,
 *   disabled?: boolean,
 *   suggestedQuestions?: any[] | null,
 *   currentDatasetId?: number | null,
 * }} props
 */
export const AskQuestionView = ({
  backendUrl,
  disabled = false,
  suggestedQuestions = null,
  currentDatasetId = null,
  initialMode = 'sql',
}) => {
  // Mode switcher: 'sql' (Query Data) vs 'rag' (Ask About This Analysis)
  const [activeMode, setActiveMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('mode') === 'rag') return 'rag'
    } catch {}
    return initialMode
  })

  // SQL Agent state
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultData, setResultData] = useState(null)
  const [queryError, setQueryError] = useState(null)

  // RAG Knowledge Agent state
  const [ragQuestion, setRagQuestion] = useState('')
  const [ragScope, setRagScope] = useState('current') // 'current' | 'all_history'
  const [ragLoading, setRagLoading] = useState(false)
  const [ragResult, setRagResult] = useState(null)
  const [ragError, setRagError] = useState(null)
  const [sourcesOpen, setSourcesOpen] = useState(true)

  // SQL Agent handler
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

  // RAG Agent handler
  const handleRunRAG = async (queryText) => {
    const q = queryText || ragQuestion
    if (!q || !q.trim() || ragLoading) return

    setRagLoading(true)
    setRagError(null)

    try {
      const response = await fetch(`${backendUrl}/api/knowledge/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: q.trim(),
          scope: ragScope,
          dataset_id: currentDatasetId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to query knowledge base.')
      }

      setRagResult(data)
      setSourcesOpen(true)
    } catch (err) {
      setRagError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setRagLoading(false)
    }
  }

  const handleSelectRAGExample = (exampleText) => {
    setRagQuestion(exampleText)
    handleRunRAG(exampleText)
  }

  const ragSuggestions = [
    'Why was row 13 flagged?',
    'What data quality issues were found in this dataset?',
    'What anomalies were flagged in the dataset?',
    ...(ragScope === 'all_history'
      ? ['How does this upload compare to previous datasets?']
      : ['Summarize the business findings and risks.']),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Mode Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px',
          borderRadius: 12,
          background: 'var(--bg-surface1)',
          border: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setActiveMode('sql')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 9,
              border: activeMode === 'sql' ? '1px solid rgba(16,185,129,0.35)' : '1px solid transparent',
              background: activeMode === 'sql' ? 'rgba(16,185,129,0.12)' : 'transparent',
              color: activeMode === 'sql' ? '#10b981' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📊</span>
            <span>Query Data (SQL Agent)</span>
          </button>

          <button
            onClick={() => setActiveMode('rag')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 9,
              border: activeMode === 'rag' ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
              background: activeMode === 'rag' ? 'rgba(99,102,241,0.14)' : 'transparent',
              color: activeMode === 'rag' ? 'var(--accent-indigo)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🧠</span>
            <span>Ask About This Analysis (RAG Agent)</span>
          </button>
        </div>

        <div style={{ paddingRight: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 99,
              background: activeMode === 'sql' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
              border: `1px solid ${activeMode === 'sql' ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.25)'}`,
              color: activeMode === 'sql' ? '#10b981' : 'var(--accent-indigo)',
            }}
          >
            {activeMode === 'sql' ? 'Text-to-SQL Engine' : 'TF-IDF Retrieval + LLM Grounding'}
          </span>
        </div>
      </div>

      {/* ── MODE 1: SQL AGENT (QUERY DATA) ────────────────────────── */}
      {activeMode === 'sql' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Natural Language Business Intelligence</span>
                <span className="text-xs font-normal text-slate-500">
                  (Autonomous Text-to-SQL Agent)
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ask questions in plain English to automatically synthesize, validate, and execute SQLite queries on the cleaned dataset.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold shadow-2xs">
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
      )}

      {/* ── MODE 2: RAG KNOWLEDGE AGENT (ASK ABOUT THIS ANALYSIS) ─── */}
      {activeMode === 'rag' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: '0 0 4px 0',
                }}
              >
                <span>RAG Knowledge Agent</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                  (Retrieval-Augmented Grounded QA)
                </span>
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Ask meta-questions about data quality flags, audit reasons, and executive findings. Every response cites verified evidence chunks.
              </p>
            </div>

            {/* Scope toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px',
                borderRadius: 8,
                background: 'var(--bg-surface1)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <button
                onClick={() => setRagScope('current')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: ragScope === 'current' ? 'var(--accent-indigo)' : 'transparent',
                  color: ragScope === 'current' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Current Dataset
              </button>
              <button
                onClick={() => setRagScope('all_history')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: ragScope === 'all_history' ? 'var(--accent-indigo)' : 'transparent',
                  color: ragScope === 'all_history' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                All Historical Uploads
              </button>
            </div>
          </div>

          {/* RAG Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleRunRAG()
            }}
            style={{
              display: 'flex',
              gap: 10,
              background: 'var(--bg-surface1)',
              padding: 8,
              borderRadius: 12,
              border: '1px solid var(--border-medium)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <input
              type="text"
              value={ragQuestion}
              onChange={(e) => setRagQuestion(e.target.value)}
              placeholder={
                ragScope === 'all_history'
                  ? 'Ask about audit issues across all uploads (e.g. "How does this upload compare to my previous run?")...'
                  : 'Ask about this analysis (e.g. "Why was row 13 flagged?", "What was the executive recommendation?")...'
              }
              disabled={ragLoading}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
            />

            <button
              type="submit"
              disabled={ragLoading || !ragQuestion.trim()}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {ragLoading ? (
                <>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: '2px solid currentColor',
                      borderTopColor: 'transparent',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Retrieving…
                </>
              ) : (
                <>
                  <span>Ask Knowledge Agent</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Suggestion Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
              Suggested queries:
            </span>
            {ragSuggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectRAGExample(item)}
                disabled={ragLoading}
                style={{
                  padding: '5px 11px',
                  borderRadius: 8,
                  background: 'var(--bg-surface1)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-indigo)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                {item}
              </button>
            ))}
          </div>

          {/* RAG Error Display */}
          {ragError && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
                fontSize: 13,
              }}
            >
              ⚠ {ragError}
            </div>
          )}

          {/* RAG Result Card */}
          {ragResult && (
            <div
              style={{
                background: 'var(--bg-surface1)',
                borderRadius: 14,
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              }}
            >
              {/* Answer Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'rgba(99,102,241,0.06)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Grounded Knowledge Answer
                  </span>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: 'rgba(99,102,241,0.15)',
                    color: 'var(--accent-indigo)',
                  }}
                >
                  {ragResult.sources?.length || 0} Sources Cited
                </span>
              </div>

              {/* Answer Body */}
              <div
                style={{
                  padding: '18px 20px',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {ragResult.answer}
              </div>

              {/* Collapsible Retrieved Sources Evidence Drawer */}
              {ragResult.sources && ragResult.sources.length > 0 && (
                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface2)',
                  }}
                >
                  <button
                    onClick={() => setSourcesOpen(!sourcesOpen)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 18px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🔍</span>
                      <span>
                        Retrieved Evidence Sources ({ragResult.sources.length} chunks used to ground this answer)
                      </span>
                    </div>
                    <span style={{ transform: sourcesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      ▼
                    </span>
                  </button>

                  {sourcesOpen && (
                    <div
                      style={{
                        padding: '12px 18px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      {ragResult.sources.map((src, i) => {
                        const isAudit = src.chunk_type === 'audit_issue'
                        return (
                          <div
                            key={i}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 8,
                              background: 'var(--bg-surface1)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: 12,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 4,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: isAudit ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)',
                                    color: isAudit ? '#f59e0b' : 'var(--accent-indigo)',
                                  }}
                                >
                                  {isAudit ? 'Audit Issue' : 'Executive Insight'}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  Dataset #{src.dataset_id}
                                </span>
                              </div>

                              {src.score > 0 && (
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                  Relevance score: {src.score}
                                </span>
                              )}
                            </div>

                            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                              {src.text}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
