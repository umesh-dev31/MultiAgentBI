import React from 'react'

type ActiveTab = 'upload' | 'quality' | 'eda' | 'sql' | 'ml' | 'insights'

interface SideNavProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  hasData: boolean
  collapsed: boolean
  onCollapse: () => void
  onLanding: () => void
  backendOnline: boolean | null
  activeFileName?: string
  flaggedCount?: number
}

const NAV_ITEMS: {
  id: ActiveTab
  label: string
  icon: React.ReactNode
  requiresData: boolean
  description: string
}[] = [
  {
    id: 'upload',
    label: 'Upload',
    requiresData: false,
    description: 'Import your dataset',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    id: 'quality',
    label: 'Data Quality',
    requiresData: true,
    description: 'Cleaning audit & schema',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
  {
    id: 'eda',
    label: 'Exploration',
    requiresData: true,
    description: 'Statistical distributions',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: 'sql',
    label: 'Ask a Question',
    requiresData: true,
    description: 'Natural language SQL',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
  {
    id: 'ml',
    label: 'ML Insights',
    requiresData: true,
    description: 'Anomaly detection & forecast',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    id: 'insights',
    label: 'Business Summary',
    requiresData: true,
    description: 'Executive intelligence brief',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
]

export const SideNav: React.FC<SideNavProps> = ({
  activeTab,
  onTabChange,
  hasData,
  collapsed,
  onCollapse,
  onLanding,
  backendOnline,
  activeFileName,
  flaggedCount,
}) => {
  const statusClass =
    backendOnline === true ? 'online' : backendOnline === false ? 'offline' : 'pending'

  return (
    <nav className="dashboard-sidenav" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Logo + Collapse Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '16px 0' : '16px 14px 16px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 11,
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(99,102,241,0.4)',
              }}
            >
              AI
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                AgentInsight
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                v0.2 · Multi-Agent BI
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface2)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Active file badge */}
      {!collapsed && activeFileName && (
        <div
          style={{
            margin: '10px 10px 4px',
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(99,102,241,0.07)',
            border: '1px solid rgba(99,102,241,0.18)',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>
            Active Dataset
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📁 {activeFileName}
          </div>
        </div>
      )}

      {/* Section label */}
      {!collapsed && (
        <div style={{ padding: '14px 16px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Workflow
        </div>
      )}

      {/* Nav items */}
      <div style={{ flex: 1, overflow: 'hidden auto' }}>
        {NAV_ITEMS.map((item, i) => {
          const disabled = item.requiresData && !hasData
          const isActive = activeTab === item.id
          const showBadge = item.id === 'quality' && flaggedCount !== undefined && flaggedCount > 0 && !collapsed

          return (
            <button
              key={item.id}
              onClick={() => !disabled && onTabChange(item.id)}
              title={collapsed ? `${item.label} — ${item.description}` : item.description}
              disabled={disabled}
              className={`nav-item${isActive ? ' active' : ''}`}
              style={{
                opacity: disabled ? 0.35 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '9px 0' : undefined,
                width: collapsed ? 'calc(100% - 16px)' : undefined,
                animationDelay: `${i * 0.04}s`,
              }}
            >
              <span className="nav-item-icon">{item.icon}</span>

              {!collapsed && (
                <>
                  <span className="nav-item-label">{item.label}</span>
                  {showBadge && (
                    <span className="nav-item-badge">{flaggedCount}</span>
                  )}
                  {isActive && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-indigo)', flexShrink: 0 }} />
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer: status + landing link */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: collapsed ? '12px 0' : '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Backend status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 8px',
            borderRadius: 8,
            background: 'var(--bg-surface2)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <span className={`status-dot ${statusClass}`} />
          {!collapsed && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {backendOnline === true ? 'API Online' : backendOnline === false ? 'API Offline' : 'Connecting…'}
            </span>
          )}
        </div>

        {/* Landing page link */}
        <button
          onClick={onLanding}
          title="Return to landing page"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 7,
            padding: '6px 8px',
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
            fontFamily: 'var(--font-sans)',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface2)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          {!collapsed && <span>Landing Page</span>}
        </button>
      </div>
    </nav>
  )
}
