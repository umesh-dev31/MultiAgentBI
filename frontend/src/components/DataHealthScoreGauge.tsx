import React, { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { DataHealthScore } from '../types/data'

interface DataHealthScoreGaugeProps {
  healthScore?: DataHealthScore | null
  size?: 'large' | 'small'
  showBreakdown?: boolean
}

export const DataHealthScoreGauge: React.FC<DataHealthScoreGaugeProps> = ({
  healthScore,
  size = 'large',
  showBreakdown = true,
}) => {
  const hasCelebratedRef = useRef(false)

  if (!healthScore) return null

  const { score, label, penalties } = healthScore
  const isLarge = size === 'large'

  // Dimensions & SVG circle calculations
  const dimension = isLarge ? 96 : 46
  const strokeWidth = isLarge ? 8 : 4.5
  const radius = (dimension - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedScore = Math.max(0, Math.min(100, score))
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference

  // Color gradient definitions based on thresholds
  // Red (< 60), Amber (60-80), Green (> 80)
  const isGreen = clampedScore > 80
  const isAmber = clampedScore >= 60 && clampedScore <= 80

  // Subtle, tasteful celebration burst upon Data Health Score reveal (< 1.5s)
  useEffect(() => {
    if (isLarge && clampedScore >= 60 && !hasCelebratedRef.current) {
      hasCelebratedRef.current = true
      try {
        confetti({
          particleCount: 36,
          spread: 60,
          origin: { y: 0.62 },
          colors: isGreen
            ? ['#10b981', '#34d399', '#6366f1', '#38bdf8']
            : ['#f59e0b', '#fbbf24', '#6366f1', '#a78bfa'],
          disableForReducedMotion: true,
          ticks: 110,
        })
      } catch {
        // graceful fallback if canvas is restricted
      }
    }
  }, [isLarge, clampedScore, isGreen])

  const gradientId = `health-gauge-grad-${size}-${score}`

  const stopColor1 = isGreen ? '#22c55e' : isAmber ? '#f59e0b' : '#ef4444'
  const stopColor2 = isGreen ? '#10b981' : isAmber ? '#eab308' : '#dc2626'
  const glowColor = isGreen
    ? 'rgba(34, 197, 94, 0.35)'
    : isAmber
    ? 'rgba(245, 158, 11, 0.35)'
    : 'rgba(239, 68, 68, 0.35)'

  const labelBg = isGreen
    ? 'var(--color-success-bg)'
    : isAmber
    ? 'var(--color-warning-bg)'
    : 'var(--color-error-bg)'

  const labelBorder = isGreen
    ? 'var(--color-success-border)'
    : isAmber
    ? 'var(--color-warning-border)'
    : 'var(--color-error-border)'

  const labelText = isGreen
    ? 'var(--color-success-text)'
    : isAmber
    ? 'var(--color-warning-text)'
    : 'var(--color-error-text)'

  if (!isLarge) {
    // ── SMALL COMPACT VERSION (FOR BUSINESS SUMMARY) ──
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '4px 12px 4px 6px',
          borderRadius: 99,
          background: 'var(--bg-surface2)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--glass-shadow)',
        }}
        title={`Data Health Score: ${score}/100 (${label})`}
      >
        <div style={{ position: 'relative', width: dimension, height: dimension, flexShrink: 0 }}>
          <svg
            width={dimension}
            height={dimension}
            style={{ transform: 'rotate(-90deg)', display: 'block' }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={stopColor1} />
                <stop offset="100%" stopColor={stopColor2} />
              </linearGradient>
            </defs>
            {/* Background track */}
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              fill="transparent"
              stroke="var(--border-subtle)"
              strokeWidth={strokeWidth}
            />
            {/* Value stroke */}
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              fill="transparent"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: labelText,
            }}
          >
            {score}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Data Health
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: labelText }}>
            {label}
          </span>
        </div>
      </div>
    )
  }

  // ── LARGE PROMINENT VERSION (FOR DATA QUALITY TAB) ──
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface2)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--glass-shadow)',
        flexShrink: 0,
      }}
    >
      {/* Circular Gauge */}
      <div style={{ position: 'relative', width: dimension, height: dimension, flexShrink: 0 }}>
        <svg
          width={dimension}
          height={dimension}
          style={{
            transform: 'rotate(-90deg)',
            display: 'block',
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stopColor1} />
              <stop offset="100%" stopColor={stopColor2} />
            </linearGradient>
          </defs>
          {/* Background track */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="transparent"
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
          />
          {/* Active progress arc */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="transparent"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>

        {/* Center Content */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            / 100
          </span>
        </div>
      </div>

      {/* Label & Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
            }}
          >
            Data Health Score
          </span>
        </div>

        {/* Health Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 99,
              background: labelBg,
              border: `1px solid ${labelBorder}`,
              color: labelText,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: stopColor1,
                boxShadow: `0 0 6px ${stopColor1}`,
              }}
            />
            {label}
          </span>
        </div>

        {/* Score Breakdown / Deductions */}
        {showBreakdown && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            Base 100
            {penalties?.flagged_penalty ? ` -${penalties.flagged_penalty} review` : ''}
            {penalties?.auto_fixed_penalty ? ` -${penalties.auto_fixed_penalty} fixes` : ''}
          </span>
        )}
      </div>
    </div>
  )
}
