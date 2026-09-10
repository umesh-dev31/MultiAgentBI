import React, { useState } from 'react'
import type { PipelineExecutionLog, UploadResponse } from '../../types/data'

type AgentStatus = 'idle' | 'running' | 'done' | 'error'

interface AgentInfo {
  id: string
  label: string
  icon: string
  status: AgentStatus
  duration?: string
}

interface RightInspectorProps {
  datasetResult: UploadResponse | null
  pipelineLogs?: PipelineExecutionLog[]
  activeFileName?: string
  isProcessing?: boolean
}

function deriveAgentStatuses(
  logs: PipelineExecutionLog[] | undefined,
  isProcessing: boolean
): AgentInfo[] {
  const agents: AgentInfo[] = [
    { id: 'data_cleaning', label: 'Data Agent', icon: '🧹', status: 'idle' },
    { id: 'validation',    label: 'Validation',  icon: '🛡️',  status: 'idle' },
    { id: 'eda',           label: 'EDA Agent',   icon: '📊',  status: 'idle' },
    { id: 'ml',            label: 'ML Agent',    icon: '🤖',  status: 'idle' },
    { id: 'visualization', label: 'Viz Agent',   icon: '🎨',  status: 'idle' },
    { id: 'insight',       label: 'Insight Agent', icon: '💡', status: 'idle' },
  ]

  if (!logs || logs.length === 0) {
    if (isProcessing) return agents.map(a => ({ ...a, status: 'running' as AgentStatus }))
    return agents
  }

  return agents.map(agent => {
    const match = logs.find(l => l.step_name?.toLowerCase().includes(agent.id.toLowerCase()))
    if (!match) return agent
    const dur = match.duration_seconds != null ? `${match.duration_seconds.toFixed(1)}s` : undefined
    const status: AgentStatus = match.status === 'success' ? 'done' : match.status === 'failed' ? 'error' : 'done'
    return { ...agent, status, duration: dur }
  })
}

const SECTION_LABELS: Record<string, string> = {
  dataset: 'Dataset',
  agents:  'Agent Status',
  logs:    'Pipeline Logs',
  schema:  'Schema',
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  datasetResult,
  pipelineLogs,
  activeFileName,
  isProcessing = false,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('agents')

  const agents = deriveAgentStatuses(pipelineLogs, isProcessing)
  const columns = datasetResult?.columns ?? []

  const toggleSection = (key: string) =>
    setExpandedSection(prev => (prev === key ? null : key))

  const SectionHeader = ({ id, label, count }: { id: string; label: string; count?: number }) => (
    <button
      onClick={() => toggleSection(id)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'none',
        border: 'none',
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: expandedSection === id ? 'none' : '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="inspector-label" style={{ margin: 0 }}>{label}</span>
        {count !== undefined && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
            background: 'var(--bg-surface3)', color: 'var(--text-muted)',
          }}>
            {count}
          </span>
        )}
      </div>
      <svg
        width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={2.5}
        style={{ transform: expandedSection === id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>
  )

  return (
    <aside className="dashboard-inspector" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          background: 'var(--bg-surface1)',
          zIndex: 10,
        }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--accent-indigo)" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          Inspector
        </span>
        {isProcessing && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#a5b4fc', fontWeight: 600 }}>
            <span
              style={{
                width: 10, height: 10, borderRadius: '50%',
                border: '2px solid #6366f1', borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
                display: 'inline-block',
              }}
            />
            Processing
          </span>
        )}
      </div>

      {/* No data empty state */}
      {!datasetResult && !isProcessing && (
        <div className="empty-state" style={{ padding: '40px 16px' }}>
          <div className="empty-state-icon">🔍</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>No dataset loaded</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200 }}>
            Upload a CSV to see pipeline telemetry and schema details here.
          </div>
        </div>
      )}

      {isProcessing && !datasetResult && (
        <div className="empty-state" style={{ padding: '40px 16px', gap: 10 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid var(--accent-indigo)', borderTopColor: 'transparent',
              animation: 'spin 0.9s linear infinite',
            }}
          />
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Pipeline running…</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Agents are processing your dataset</div>
        </div>
      )}

      {/* ── Dataset section ── */}
      {(datasetResult || activeFileName) && (
        <>
          <SectionHeader id="dataset" label={SECTION_LABELS.dataset} />
          {expandedSection === 'dataset' && (
            <div className="inspector-section" style={{ paddingTop: 4 }}>
              {activeFileName && (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'rgba(99,102,241,0.07)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>File</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                    {activeFileName}
                  </div>
                </div>
              )}
              {datasetResult && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Raw rows', value: datasetResult.shape?.[0] },
                    { label: 'Columns', value: datasetResult.shape?.[1] },
                    { label: 'Cleaned rows', value: datasetResult.summary?.cleaned_rows },
                    { label: 'Flagged', value: datasetResult.data_quality_report?.flagged_for_review?.length ?? 0 },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'var(--bg-surface2)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {value ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Agent Status section ── */}
      <SectionHeader id="agents" label={SECTION_LABELS.agents} count={agents.filter(a => a.status === 'done').length} />
      {expandedSection === 'agents' && (
        <div className="inspector-section" style={{ paddingTop: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {agents.map(agent => (
              <div
                key={agent.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: 'var(--bg-surface2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: 13 }}>{agent.icon}</span>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {agent.label}
                </span>
                <span className={`agent-pill ${agent.status}`} style={{ padding: '2px 8px', fontSize: 10 }}>
                  {agent.status === 'running' && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  )}
                  {agent.status === 'done'    && '✓'}
                  {agent.status === 'error'   && '✗'}
                  {agent.status === 'idle'    && '○'}
                  {agent.status !== 'idle' && agent.duration && (
                    <span style={{ color: 'var(--text-muted)', fontSize: 9, marginLeft: 2 }}>{agent.duration}</span>
                  )}
                  {agent.status === 'idle' && ' idle'}
                  {agent.status === 'done' && ' done'}
                  {agent.status === 'error' && ' error'}
                  {agent.status === 'running' && ' running'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pipeline Logs section ── */}
      {pipelineLogs && pipelineLogs.length > 0 && (
        <>
          <SectionHeader id="logs" label={SECTION_LABELS.logs} count={pipelineLogs.length} />
          {expandedSection === 'logs' && (
            <div className="inspector-section" style={{ paddingTop: 4 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pipelineLogs.map((log, i) => (
                  <div key={i} className="log-entry">
                    <span className="log-step">{log.step_name}</span>
                    {log.duration_seconds != null && (
                      <span className="log-dur">{log.duration_seconds.toFixed(2)}s</span>
                    )}
                    <br />
                    <span className={log.status === 'success' ? 'log-ok' : 'log-err'}>
                      {log.status === 'success' ? '✓ success' : `✗ ${log.status}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Schema Quick-Peek section ── */}
      {columns.length > 0 && (
        <>
          <SectionHeader id="schema" label={SECTION_LABELS.schema} count={columns.length} />
          {expandedSection === 'schema' && (
            <div className="inspector-section" style={{ paddingTop: 4 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {columns.slice(0, 20).map((col) => (
                  <div
                    key={col.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderRadius: 6,
                      background: 'var(--bg-surface2)',
                    }}
                  >
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {col.name}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        padding: '1px 6px',
                        borderRadius: 99,
                        background: 'var(--bg-surface3)',
                        color: col.dtype?.includes('int') || col.dtype?.includes('float')
                          ? 'var(--accent-cyan)'
                          : col.dtype?.includes('date') || col.dtype?.includes('time')
                          ? '#a78bfa'
                          : 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {col.dtype ?? 'str'}
                    </span>
                  </div>
                ))}
                {columns.length > 20 && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 4 }}>
                    +{columns.length - 20} more columns
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  )
}
