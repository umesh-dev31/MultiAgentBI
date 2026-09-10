import React, { useEffect, useRef } from 'react'

type ActiveTab = 'upload' | 'quality' | 'eda' | 'sql' | 'ml' | 'insights'

interface CenterCanvasProps {
  activeTab: ActiveTab
  children: React.ReactNode
}

// Re-animate content when the tab changes
export const CenterCanvas: React.FC<CenterCanvasProps> = ({ activeTab, children }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.style.animation = 'none'
    // Force reflow
    void el.offsetHeight
    el.style.animation = 'fadeSlideIn 0.22s ease both'
  }, [activeTab])

  return (
    <div
      ref={containerRef}
      style={{
        padding: '28px 28px 48px',
        minHeight: '100%',
        animation: 'fadeSlideIn 0.22s ease both',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </div>
  )
}
