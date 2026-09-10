import React, { useState } from 'react'
import { SideNav } from './SideNav'
import { RightInspector } from './RightInspector'
import type { PipelineExecutionLog, UploadResponse } from '../../types/data'

type ActiveTab = 'upload' | 'quality' | 'eda' | 'sql' | 'ml' | 'insights'

interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  hasData: boolean
  onLanding: () => void
  onReset: () => void
  backendOnline: boolean | null
  activeFileName?: string
  datasetResult: UploadResponse | null
  pipelineLogs?: PipelineExecutionLog[]
  isProcessing?: boolean
  error?: string | null
  onDismissError?: () => void
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  hasData,
  onLanding,
  onReset,
  backendOnline,
  activeFileName,
  datasetResult,
  pipelineLogs,
  isProcessing = false,
  error,
  onDismissError,
}) => {
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)

  const shellClass = [
    'dashboard-shell',
    navCollapsed ? 'nav-collapsed' : '',
    !inspectorOpen ? 'inspector-closed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const flaggedCount = datasetResult?.data_quality_report?.flagged_for_review?.length

  return (
    <div className={shellClass}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="dashboard-topbar">
        {/* Left: brand logo area (matches nav width) */}
        <div
          style={{
            width: navCollapsed ? 'var(--nav-collapsed)' : 'var(--nav-width)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            borderRight: '1px solid var(--border-subtle)',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {navCollapsed ? (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 11,
                color: '#fff',
                boxShadow: '0 0 12px rgba(99,102,241,0.4)',
              }}
            >
              AI
            </div>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
              AgentInsight AI
            </span>
          )}
        </div>

        {/* Center: breadcrumb / active tab label */}
        <div style={{ flex: 1, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dashboard</span>
            <span style={{ color: 'var(--border-medium)' }}>›</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {activeTab === 'sql' ? 'Ask a Question' : activeTab === 'eda' ? 'Exploration' : activeTab === 'ml' ? 'ML Insights' : activeTab === 'insights' ? 'Business Summary' : activeTab === 'quality' ? 'Data Quality' : 'Upload'}
            </span>
          </div>

          {isProcessing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '4px 10px',
                borderRadius: 99,
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.25)',
                fontSize: 11,
                fontWeight: 600,
                color: '#a5b4fc',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: '2px solid #6366f1',
                  borderTopColor: 'transparent',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              Running pipeline…
            </div>
          )}

          {/* Error banner inline */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                borderRadius: 99,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                fontSize: 11,
                fontWeight: 600,
                color: '#f87171',
                maxWidth: 400,
              }}
            >
              <span>⚠</span>
              <span
                style={{
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {error}
              </span>
              {onDismissError && (
                <button
                  onClick={onDismissError}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {hasData && (
            <button
              onClick={onReset}
              className="btn-ghost"
              style={{ fontSize: 11, padding: '5px 12px' }}
              title="Reset dataset and start over"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              New dataset
            </button>
          )}

          <button
            onClick={() => setInspectorOpen(p => !p)}
            className="btn-ghost"
            style={{ fontSize: 11, padding: '5px 10px', gap: 5 }}
            title={inspectorOpen ? 'Hide inspector panel' : 'Show inspector panel'}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Inspector
          </button>
        </div>
      </header>

      {/* ── Side Navigation ──────────────────────────────────────────────── */}
      <SideNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        hasData={hasData}
        collapsed={navCollapsed}
        onCollapse={() => setNavCollapsed(p => !p)}
        onLanding={onLanding}
        backendOnline={backendOnline}
        activeFileName={activeFileName}
        flaggedCount={flaggedCount}
      />

      {/* ── Main Canvas ──────────────────────────────────────────────────── */}
      <main className="dashboard-canvas">
        {children}
      </main>

      {/* ── Right Inspector ──────────────────────────────────────────────── */}
      {inspectorOpen && (
        <RightInspector
          datasetResult={datasetResult}
          pipelineLogs={pipelineLogs}
          activeFileName={activeFileName}
          isProcessing={isProcessing}
        />
      )}
    </div>
  )
}
