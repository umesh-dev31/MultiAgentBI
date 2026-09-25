import React, { useEffect, useState } from 'react'
import type { HistoryItem } from '../../types/data'

interface HistoryViewProps {
  backendUrl: string
  onLoadDataset: (datasetId: number) => Promise<void>
  activeDatasetId?: number | null
  loadingDatasetId?: number | null
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  backendUrl,
  onLoadDataset,
  activeDatasetId,
  loadingDatasetId,
}) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${backendUrl}/api/history`)
      if (!res.ok) {
        throw new Error(`Failed to fetch history (HTTP ${res.status})`)
      }
      const data: HistoryItem[] = await res.json()
      setHistoryItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dataset history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [backendUrl])

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Unknown date'
    try {
      const date = new Date(isoString)
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch {
      return isoString
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto' }}>
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Upload History & Archives
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: 99,
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.25)',
                color: 'var(--accent-indigo)',
              }}
            >
              PostgreSQL-ready / SQLite
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Persistent storage records each pipeline run, audit issues, and analytical models. Click any run to load its full results across all tabs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="btn-ghost"
            style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
            title="Refresh history"
          >
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, color: '#ef4444' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && historyItems.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            background: 'var(--bg-surface1)',
            borderRadius: 16,
            border: '1px solid var(--border-subtle)',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '3px solid var(--accent-indigo)',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Retrieving persistent upload records…
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && historyItems.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '70px 20px',
            background: 'var(--bg-surface1)',
            borderRadius: 16,
            border: '1px dashed var(--border-medium)',
            textAlign: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--bg-surface2)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              No Historical Runs Yet
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420 }}>
              Upload your first dataset on the Upload tab. Each pipeline execution will automatically be persisted here for instant recall.
            </div>
          </div>
        </div>
      )}

      {/* History Grid of Cards */}
      {historyItems.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {historyItems.map((item) => {
            const isActive = activeDatasetId === item.id
            const isLoadingThis = loadingDatasetId === item.id

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-surface1)',
                  borderRadius: 14,
                  border: isActive
                    ? '1.5px solid var(--accent-indigo)'
                    : '1px solid var(--border-subtle)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                  boxShadow: isActive ? '0 0 16px rgba(99,102,241,0.15)' : 'none',
                  position: 'relative',
                }}
              >
                {/* Top row: Filename & ID Badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.filename}
                      >
                        {item.filename}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Uploaded: {formatDate(item.uploaded_at)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: 'var(--bg-surface2)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Run #{item.id}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'rgba(16,185,129,0.12)',
                          border: '1px solid rgba(16,185,129,0.3)',
                          color: '#10b981',
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics Badges Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-surface2)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Validated</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                      {item.validated_row_count} <span style={{ fontSize: 10, fontWeight: 500 }}>rows</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Flagged</div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: item.flagged_count > 0 ? '#f59e0b' : 'var(--text-secondary)',
                      }}
                    >
                      {item.flagged_count} <span style={{ fontSize: 10, fontWeight: 500 }}>issues</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Original</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.row_count} <span style={{ fontSize: 10, fontWeight: 500 }}>rows</span>
                    </div>
                  </div>
                </div>

                {/* Card footer: Load button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 }}>
                  <button
                    onClick={() => onLoadDataset(item.id)}
                    disabled={isLoadingThis}
                    className="btn-primary"
                    style={{
                      fontSize: 12,
                      padding: '7px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isActive ? 'var(--bg-surface2)' : undefined,
                      color: isActive ? 'var(--text-primary)' : undefined,
                      border: isActive ? '1px solid var(--border-medium)' : undefined,
                    }}
                  >
                    {isLoadingThis ? (
                      <>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            border: '2px solid currentColor',
                            borderTopColor: 'transparent',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        Loading Run…
                      </>
                    ) : isActive ? (
                      <>
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reload View
                      </>
                    ) : (
                      <>
                        Load into Workspace
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
