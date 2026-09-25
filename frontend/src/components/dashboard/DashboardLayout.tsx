import React, { useState } from 'react'
import { SideNav } from './SideNav'
import { Logo } from '../Logo'
import { RightInspector } from './RightInspector'
import { ThemeToggle } from '../ThemeToggle'
import type { PipelineExecutionLog, UploadResponse } from '../../types/data'

type ActiveTab = 'upload' | 'quality' | 'eda' | 'sql' | 'ml' | 'insights' | 'history'

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
        {/* Left: brand logo area & sidebar toggle (matches nav width) */}
        <button
          type="button"
          onClick={() => setNavCollapsed(p => !p)}
          title={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: navCollapsed ? 'var(--nav-collapsed)' : 'var(--nav-width)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
            borderRight: '1px solid var(--border-subtle)',
            borderTop: 'none',
            borderLeft: 'none',
            borderBottom: 'none',
            background: 'transparent',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease',
            cursor: 'pointer',
            overflow: 'hidden',
            paddingLeft: navCollapsed ? 20 : 16,
            paddingRight: navCollapsed ? 0 : 14,
            boxSizing: 'border-box',
            textAlign: 'left',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface2)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <Logo size="sm" />
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                display: 'inline-block',
                maxWidth: navCollapsed ? 0 : 140,
                opacity: navCollapsed ? 0 : 1,
                marginLeft: navCollapsed ? 0 : 10,
                transform: navCollapsed ? 'translateX(-8px)' : 'translateX(0)',
                transition:
                  'max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: 'none',
              }}
            >
              AgentInsight AI
            </span>
          </div>

          {!navCollapsed && (
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{
                color: 'var(--text-muted)',
                flexShrink: 0,
                opacity: 0.6,
                transition: 'opacity 0.15s ease',
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          )}
        </button>

        {/* Center: breadcrumb / active tab label */}
        <div style={{ flex: 1, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dashboard</span>
            <span style={{ color: 'var(--border-medium)' }}>›</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {activeTab === 'sql' ? 'Ask a Question' : activeTab === 'eda' ? 'Exploration' : activeTab === 'ml' ? 'ML Insights' : activeTab === 'insights' ? 'Business Summary' : activeTab === 'quality' ? 'Data Quality' : activeTab === 'history' ? 'Upload History' : 'Upload'}
            </span>
          </div>

          {isProcessing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '4px 12px',
                borderRadius: 6,
                background: 'var(--border-subtle)',
                border: '1px solid var(--border-medium)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: '2px solid var(--text-primary)',
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
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.35)',
                backdropFilter: 'blur(10px)',
                fontSize: 11,
                fontWeight: 600,
                color: '#f87171',
                maxWidth: 400,
                boxShadow: '0 0 14px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, color: '#f87171' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
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
          <ThemeToggle />

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
            style={{ fontSize: 11, padding: '5px 12px', gap: 6 }}
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
