import { useEffect, useState } from 'react'
import { requestJson } from '../../api'
import type { HistoryItem } from '../../types/data'
import './WorkspaceOverview.css'

const tools = [
  ['upload', 'Upload data', 'Import a CSV or Excel dataset.'],
  ['quality', 'Check data quality', 'Review cleaning results and flagged values.'],
  ['eda', 'Explore data', 'Find patterns, distributions, and trends.'],
  ['sql', 'Ask a question', 'Query your dataset in plain language.'],
  ['ml', 'ML Insights', 'Explore anomalies and build prediction models.'],
  ['insights', 'Business summary', 'Read the key findings from your analysis.'],
] as const

type Tool = (typeof tools)[number][0]

export function WorkspaceOverview({ username, activeFile, onNavigate, onLoad, loadingId }: {
  username: string
  activeFile?: string
  onNavigate: (tab: Tool | 'history') => void
  onLoad: (id: number) => Promise<void>
  loadingId: number | null
}) {
  const [recent, setRecent] = useState<HistoryItem[] | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    requestJson<HistoryItem[]>('/api/history', { signal: controller.signal })
      .then(items => { if (!controller.signal.aborted) setRecent(items.slice(0, 4)) })
      .catch(() => { if (!controller.signal.aborted) setUnavailable(true) })
    return () => controller.abort()
  }, [])

  const latest = recent?.[0]
  const canResume = Boolean(activeFile || latest)

  return (
    <div className="workspace-overview">
      <header>
        <h1>Welcome, {username}</h1>
        <p>Upload, explore, and model your data from one workspace.</p>
      </header>

      <section className="overview-panel overview-start" aria-labelledby="overview-start">
        <div>
          <h2 id="overview-start">{canResume ? 'Continue your analysis' : 'Get started with your data'}</h2>
          <p>{activeFile || latest?.filename || 'Upload a dataset or reopen one from Recent datasets.'}</p>
        </div>
        <div className="overview-actions">
          {canResume && (
            <button className="btn-primary" disabled={loadingId !== null} onClick={() => {
              if (activeFile) onNavigate('quality')
              else if (latest) void onLoad(latest.id)
            }}>{loadingId !== null ? 'Opening dataset…' : 'Continue analysis'}</button>
          )}
          <button className={canResume ? 'btn-ghost' : 'btn-primary'} onClick={() => onNavigate('upload')}>Upload dataset</button>
        </div>
      </section>

      <section aria-labelledby="overview-tools">
        <h2 id="overview-tools">Workspace tools</h2>
        <div className="overview-tools">
          {tools.map(([tab, label, description]) => (
            <button className="overview-panel overview-tool" key={tab} onClick={() => onNavigate(tab)}>
              <span><strong>{label}</strong><span>{description}</span></span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>

      <section className="overview-panel overview-recent" aria-labelledby="overview-recent">
        <div className="overview-section-header">
          <h2 id="overview-recent">Recent datasets</h2>
          <button className="btn-ghost" onClick={() => onNavigate('history')}>View history</button>
        </div>
        {unavailable ? <p role="status">Could not load recent datasets.</p> : !recent ? <p role="status">Loading recent datasets…</p> :
          recent.length === 0 ? <p>No datasets yet. Upload a file to get started.</p> :
            <ul>{recent.map(item => (
              <li key={item.id}>
                <button onClick={() => void onLoad(item.id)} disabled={loadingId !== null}>
                  <strong>{item.filename}</strong>
                  <span>{loadingId === item.id ? 'Opening…' : item.row_count.toLocaleString() + ' rows'}</span>
                </button>
              </li>
            ))}</ul>}
      </section>
    </div>
  )
}
