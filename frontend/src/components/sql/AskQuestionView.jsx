import React, { useState, useEffect, useRef } from 'react'
import { QueryInput } from './QueryInput'
import { ExampleQuestions } from './ExampleQuestions'
import { QueryResult } from './QueryResult'

/* ─────────────────────────────────────────────
   Internal: animated chunk appearance for Stage 1
   ───────────────────────────────────────────── */
function ChunkAppearList({ chunks, visible }) {
  const [shown, setShown] = useState([])

  useEffect(() => {
    if (!visible || chunks.length === 0) {
      setShown([])
      return
    }
    setShown([])
    chunks.forEach((_, i) => {
      setTimeout(() => {
        setShown(prev => [...prev, i])
      }, i * 320 + 80)
    })
  }, [visible, chunks])

  if (!visible) return null

  const typeColors = {
    audit_issue: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', label: '#f59e0b', tag: 'Audit Issue', icon: 'search' },
    insight_summary: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.3)', label: 'var(--accent-indigo)', tag: 'Executive Insight', icon: 'lightbulb' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {chunks.map((chunk, i) => {
        const isVisible = shown.includes(i)
        const colors = typeColors[chunk.chunk_type] || typeColors.audit_issue
        return (
          <div
            key={i}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: colors.bg,
                    color: colors.label,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {colors.icon} {colors.tag}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                  Dataset #{chunk.dataset_id}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>TF-IDF Match</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: chunk.score >= 1.5
                      ? 'rgba(16,185,129,0.15)'
                      : chunk.score >= 0.3
                        ? 'rgba(245,158,11,0.15)'
                        : 'rgba(148,163,184,0.1)',
                    color: chunk.score >= 1.5 ? '#10b981' : chunk.score >= 0.3 ? '#f59e0b' : 'var(--text-muted)',
                    border: `1px solid ${chunk.score >= 1.5 ? 'rgba(16,185,129,0.3)' : chunk.score >= 0.3 ? 'rgba(245,158,11,0.3)' : 'rgba(148,163,184,0.2)'}`,
                    letterSpacing: '0.02em',
                  }}
                >
                  {chunk.score.toFixed(2)}
                </span>
              </div>
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                fontFamily: 'var(--font-mono, monospace)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {chunk.text}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Internal: Stage animation indicator
   ───────────────────────────────────────────── */
function StageIndicator({ stage, label, doneLabel, description, active, done }) {
  const displayLabel = done && doneLabel ? doneLabel : label
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '10px 14px',
      borderRadius: 10,
      background: active
        ? 'rgba(99,102,241,0.08)'
        : done
          ? 'rgba(16,185,129,0.06)'
          : 'var(--bg-surface2)',
      border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : done ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
      transition: 'all 0.3s ease',
    }}>
      {/* Stage number / spinner */}
      <div style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? '#6366f1' : done ? '#10b981' : 'var(--bg-surface1)',
        border: `2px solid ${active ? '#6366f1' : done ? '#10b981' : 'var(--border-medium)'}`,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {active ? (
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.4)',
            borderTopColor: '#fff',
            animation: 'spin 0.7s linear infinite',
          }} />
        ) : done ? (
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{stage}</span>
        )}
      </div>
      <div>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: active ? '#6366f1' : done ? '#10b981' : 'var(--text-muted)',
          transition: 'color 0.3s',
        }}>
          Stage {stage} — {displayLabel}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */
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
  // Mode switcher
  const [activeMode, setActiveMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('mode') === 'rag') return 'rag'
    } catch {}
    return initialMode
  })

  // SQL state
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultData, setResultData] = useState(null)
  const [queryError, setQueryError] = useState(null)

  // RAG state
  const [ragQuestion, setRagQuestion] = useState('')
  const [ragScope, setRagScope] = useState('current')
  const [ragLoading, setRagLoading] = useState(false)
  const [ragResult, setRagResult] = useState(null)
  const [ragError, setRagError] = useState(null)
  const [sourcesOpen, setSourcesOpen] = useState(true)

  // RAG pipeline stage state: idle | retrieving | generating | done
  const [ragStage, setRagStage] = useState('idle')
  // Intermediate: chunks retrieved in stage 1 before answer is ready
  const [previewChunks, setPreviewChunks] = useState([])

  // SQL handler
  const handleRunQuery = async (queryText) => {
    const q = queryText || question
    if (!q || !q.trim() || loading || disabled) return
    setLoading(true)
    setQueryError(null)
    try {
      const response = await fetch(`${backendUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.trim(), dataset_id: currentDatasetId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Failed to execute query.')
      setResultData(data)
      if (data.error) setQueryError(data.error)
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

  // RAG handler with two-stage animation
  const handleRunRAG = async (queryText) => {
    const q = queryText || ragQuestion
    if (!q || !q.trim() || ragLoading) return

    setRagLoading(true)
    setRagError(null)
    setRagResult(null)
    setPreviewChunks([])
    setRagStage('retrieving')

    try {
      // Single API call — but we animate stage 1 for a minimum visible duration
      const startTime = Date.now()

      const response = await fetch(`${backendUrl}/api/knowledge/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      // Show retrieved chunks in Stage 1 — at least 1.8s visible
      const elapsed = Date.now() - startTime
      const stage1Delay = Math.max(0, 1800 - elapsed)

      setPreviewChunks(data.sources || [])
      setRagStage('retrieving') // Still showing stage 1

      await new Promise(res => setTimeout(res, stage1Delay))

      // Transition to Stage 2
      setRagStage('generating')
      await new Promise(res => setTimeout(res, 700))

      // Show final answer
      setRagResult(data)
      setSourcesOpen(true)
      setRagStage('done')
    } catch (err) {
      setRagError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setRagStage('idle')
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
    'How does this dataset\'s data quality compare to my previous upload?',
    ...(ragScope === 'all_history'
      ? ['Compare flagged issue counts across all uploaded datasets.']
      : ['What was the executive recommendation for this dataset?']),
  ]

  // Dataset badge color helper
  const getDatasetColor = (dsId) => {
    const colors = [
      ['rgba(99,102,241,0.12)', 'rgba(99,102,241,0.3)', '#a5b4fc'],
      ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.3)', '#6ee7b7'],
      ['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.3)', '#fcd34d'],
      ['rgba(236,72,153,0.12)', 'rgba(236,72,153,0.3)', '#f9a8d4'],
      ['rgba(6,182,212,0.12)', 'rgba(6,182,212,0.3)', '#67e8f9'],
    ]
    return colors[dsId % colors.length]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Mode Switcher ── */}
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
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 9,
              border: activeMode === 'sql' ? '1px solid rgba(16,185,129,0.35)' : '1px solid transparent',
              background: activeMode === 'sql' ? 'rgba(16,185,129,0.12)' : 'transparent',
              color: activeMode === 'sql' ? '#10b981' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18" />
            </svg>
            <span>Query Data (SQL Agent)</span>
          </button>

          <button
            onClick={() => setActiveMode('rag')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 9,
              border: activeMode === 'rag' ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
              background: activeMode === 'rag' ? 'rgba(99,102,241,0.14)' : 'transparent',
              color: activeMode === 'rag' ? 'var(--accent-indigo)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Ask About This Analysis (RAG Agent)</span>
          </button>
        </div>

        <div style={{ paddingRight: 8 }}>
          <span
            style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
              background: activeMode === 'sql' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
              border: `1px solid ${activeMode === 'sql' ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.25)'}`,
              color: activeMode === 'sql' ? '#10b981' : 'var(--accent-indigo)',
            }}
          >
            {activeMode === 'sql' ? 'Text-to-SQL Engine' : 'TF-IDF Retrieval + LLM Grounding'}
          </span>
        </div>
      </div>

      {/* ── MODE 1: SQL AGENT ── */}
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
          <QueryInput
            question={question}
            setQuestion={setQuestion}
            onSubmit={handleRunQuery}
            loading={loading}
            disabled={disabled}
          />
          <ExampleQuestions
            onSelectQuestion={handleSelectExample}
            disabled={disabled || loading}
            backendUrl={backendUrl}
            initialQuestions={suggestedQuestions}
          />
          <QueryResult
            resultData={resultData}
            loading={loading}
            error={queryError}
          />
        </div>
      )}

      {/* ── MODE 2: RAG KNOWLEDGE AGENT ── */}
      {activeMode === 'rag' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header with scope toggle */}
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap',
            }}
          >
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px 0' }}>
                <span>RAG Knowledge Agent</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                  (Retrieval-Augmented Grounded QA)
                </span>
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Ask meta-questions about data quality flags, audit reasons, and executive findings. Every response cites verified evidence chunks.
              </p>
              {/* Technical credibility label */}
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                    color: 'var(--accent-indigo)', letterSpacing: '0.03em',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  Retrieval Method: TF-IDF cosine similarity + row-boost heuristic
                </span>
              </div>
            </div>

            {/* Scope toggle */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '3px',
                borderRadius: 8, background: 'var(--bg-surface1)', border: '1px solid var(--border-medium)',
              }}
            >
              <button
                onClick={() => setRagScope('current')}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  background: ragScope === 'current' ? '#6366f1' : 'transparent',
                  color: ragScope === 'current' ? '#fff' : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Current Dataset
              </button>
              <button
                onClick={() => setRagScope('all_history')}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  background: ragScope === 'all_history' ? '#6366f1' : 'transparent',
                  color: ragScope === 'all_history' ? '#fff' : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                All Historical Uploads
              </button>
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleRunRAG() }}
            style={{
              display: 'flex', gap: 10, background: 'var(--bg-surface1)', padding: 8,
              borderRadius: 12, border: '1px solid var(--border-medium)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <input
              type="text"
              value={ragQuestion}
              onChange={(e) => setRagQuestion(e.target.value)}
              placeholder={
                ragScope === 'all_history'
                  ? 'Ask across all uploads (e.g. "How does this dataset compare to my previous upload?")...'
                  : 'Ask about this analysis (e.g. "Why was row 13 flagged?", "What was the executive recommendation?")...'
              }
              disabled={ragLoading}
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <button
              type="submit"
              disabled={ragLoading || !ragQuestion.trim()}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600 }}
            >
              {ragLoading ? (
                <>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  {ragStage === 'retrieving' ? 'Retrieving...' : 'Generating...'}
                </>
              ) : (
                <>
                  <span>Ask Knowledge Agent</span>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Suggestion chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Demo queries:</span>
            {ragSuggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectRAGExample(item)}
                disabled={ragLoading}
                style={{
                  padding: '5px 11px', borderRadius: 8,
                  background: 'var(--bg-surface1)', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-indigo)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Error */}
          {ragError && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 13 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {ragError}
            </div>
          )}

          {/* ── TWO-STAGE PIPELINE DISPLAY ── */}
          {(ragLoading || ragResult) && (
            <div
              style={{
                background: 'var(--bg-surface1)',
                borderRadius: 16,
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              {/* Pipeline header */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 18px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'var(--bg-surface2)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--text-secondary)" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      RAG Pipeline — Knowledge Retrieval &amp; Synthesis
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                      TF-IDF cosine similarity across indexed chunks
                    </div>
                  </div>
                </div>
                {ragResult && (
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                      background: 'rgba(16,185,129,0.15)', color: '#10b981',
                      border: '1px solid rgba(16,185,129,0.3)',
                    }}
                  >
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {ragResult.sources?.length || 0} Sources Cited
                  </span>
                )}
              </div>

              {/* Stage indicators + content */}
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Stage 1 */}
                <StageIndicator
                  stage={1}
                  label="Retrieving relevant context…"
                  doneLabel="Context retrieved"
                  description={
                    ragStage === 'generating' || ragStage === 'done'
                      ? `${previewChunks.length} chunks from ${new Set(previewChunks.map(c => c.dataset_id)).size} dataset(s) — TF-IDF cosine similarity`
                      : previewChunks.length > 0
                        ? `Found ${previewChunks.length} relevant chunks — scanning knowledge base`
                        : 'Scanning knowledge base with TF-IDF cosine similarity'
                  }
                  active={ragStage === 'retrieving'}
                  done={ragStage === 'generating' || ragStage === 'done'}
                />

                {/* Stage 1 chunk preview — always show when chunks available */}
                {(ragStage === 'retrieving' || ragStage === 'generating' || ragStage === 'done') && previewChunks.length > 0 && (
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-surface2)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Retrieved Chunks — Appearing One by One
                    </div>
                    <ChunkAppearList
                      chunks={previewChunks}
                      visible={ragStage === 'retrieving' || ragStage === 'generating' || ragStage === 'done'}
                    />
                  </div>
                )}

                {/* Stage 2 */}
                <StageIndicator
                  stage={2}
                  label="Generating grounded answer…"
                  doneLabel="Answer ready"
                  description={
                    ragStage === 'done'
                      ? 'Synthesized from retrieved evidence — scroll down to read'
                      : 'Feeding retrieved chunks to LLM for grounded synthesis'
                  }
                  active={ragStage === 'generating'}
                  done={ragStage === 'done'}
                />
              </div>

              {/* ── FINAL ANSWER ── */}
              {ragResult && (
                <>
                  {/* Answer body */}
                  <div
                    style={{
                      padding: '18px 20px',
                      borderTop: '1px solid var(--border-subtle)',
                      background: 'linear-gradient(180deg, rgba(99,102,241,0.03) 0%, transparent 40%)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--text-secondary)" strokeWidth={1.8} style={{ flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Grounded Knowledge Answer</span>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {ragResult.answer
                        .replace(/\*\*([^*]+)\*\*/g, '$1')
                        .replace(/__([^_]+)__/g, '$1')
                        .replace(/\*([^*]+)\*/g, '$1')
                        .replace(/_([^_]+)_/g, '$1')}
                    </div>
                  </div>

                  {/* Sources Used panel */}
                  {ragResult.sources && ragResult.sources.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface2)' }}>
                      <button
                        onClick={() => setSourcesOpen(!sourcesOpen)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--text-secondary)" strokeWidth={2} style={{ flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            Sources Used
                          </span>
                          <span
                            style={{
                              fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                              background: 'rgba(99,102,241,0.12)', color: 'var(--accent-indigo)',
                              border: '1px solid rgba(99,102,241,0.2)',
                            }}
                          >
                            {ragResult.sources.length} chunks retrieved • grounded the answer above
                          </span>
                          {/* Cross-dataset badge */}
                          {new Set(ragResult.sources.map(s => s.dataset_id)).size > 1 && (
                            <span
                              style={{
                                fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                                background: 'rgba(16,185,129,0.12)', color: '#10b981',
                                border: '1px solid rgba(16,185,129,0.3)',
                              }}
                            >
                              ✦ Cross-dataset retrieval ({new Set(ragResult.sources.map(s => s.dataset_id)).size} datasets)
                            </span>
                          )}
                        </div>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={2} style={{ transform: sourcesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {sourcesOpen && (
                        <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {ragResult.sources.map((src, i) => {
                            const isAudit = src.chunk_type === 'audit_issue'
                            const [bg, border, textColor] = getDatasetColor(src.dataset_id)
                            return (
                              <div
                                key={i}
                                style={{
                                  padding: '12px 14px', borderRadius: 10,
                                  background: 'var(--bg-surface1)',
                                  border: '1px solid var(--border-subtle)',
                                  fontSize: 12,
                                  transition: 'border-color 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                              >
                                {/* Chunk meta row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span
                                      style={{
                                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                                        background: isAudit ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                                        color: isAudit ? '#f59e0b' : 'var(--accent-indigo)',
                                        border: `1px solid ${isAudit ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)'}`,
                                      }}
                                    >
                                      {isAudit ? 'Audit Issue' : 'Executive Insight'}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                                        background: bg, border: `1px solid ${border}`, color: textColor,
                                        fontFamily: 'var(--font-mono, monospace)',
                                      }}
                                    >
                                      Dataset #{src.dataset_id}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>TF-IDF similarity</span>
                                    <span
                                      style={{
                                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                                        background: src.score >= 1.5
                                          ? 'rgba(16,185,129,0.15)'
                                          : src.score >= 0.3
                                            ? 'rgba(245,158,11,0.15)'
                                            : 'rgba(148,163,184,0.1)',
                                        color: src.score >= 1.5 ? '#10b981' : src.score >= 0.3 ? '#f59e0b' : 'var(--text-muted)',
                                        border: `1px solid ${src.score >= 1.5 ? 'rgba(16,185,129,0.3)' : src.score >= 0.3 ? 'rgba(245,158,11,0.3)' : 'rgba(148,163,184,0.2)'}`,
                                        letterSpacing: '0.02em',
                                      }}
                                    >
                                      {src.score.toFixed(3)}
                                    </span>
                                  </div>
                                </div>

                                {/* Chunk text */}
                                <div
                                  style={{
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.5,
                                    fontFamily: 'var(--font-mono, monospace)',
                                    fontSize: 11.5,
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    background: 'var(--bg-surface2)',
                                    border: '1px solid var(--border-subtle)',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {src.text}
                                </div>
                              </div>
                            )
                          })}

                          {/* Method label at bottom */}
                          <div
                            style={{
                              padding: '8px 12px', borderRadius: 8,
                              background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)',
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}
                          >
                            <span style={{ fontSize: 11 }}>ℹ️</span>
                            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                              Retrieval Method: TF-IDF cosine similarity across {ragResult.sources.length} indexed chunks
                              {ragScope === 'all_history' ? ' (all_history scope — cross-dataset)' : ' (current dataset scope)'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
