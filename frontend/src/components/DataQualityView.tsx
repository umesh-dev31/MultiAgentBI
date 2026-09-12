import React, { useState, useMemo } from 'react'
import type { ColumnInfo, CleanedRecord, DataQualityReport, DataSummary, DataHealthScore } from '../types/data'
import { DataHealthScoreGauge } from './DataHealthScoreGauge'

interface DataQualityViewProps {
  summary: DataSummary
  shape: [number, number]
  fileName?: string
  columns: ColumnInfo[]
  cleanedPreview: CleanedRecord[]
  report?: DataQualityReport
  healthScore?: DataHealthScore
  onReset: () => void
  onProceed: () => void
}

type TabMode = 'audit' | 'preview' | 'schema' | 'split'

export const DataQualityView: React.FC<DataQualityViewProps> = ({
  summary,
  shape,
  fileName,
  columns,
  cleanedPreview,
  report,
  healthScore,
  onReset,
  onProceed,
}) => {
  const [rows, cols] = shape
  const [activeTab, setActiveTab] = useState<TabMode>('audit')
  const [columnFilter, setColumnFilter] = useState<string>('all')
  const [auditSearch, setAuditSearch] = useState<string>('')
  const [previewSearch, setPreviewSearch] = useState<string>('')

  // Report calculations
  const autoFixed = report?.auto_fixed
  const flaggedItems = report?.flagged_for_review || []

  const totalAutoFixed = autoFixed
    ? autoFixed.whitespace_trimmed +
      autoFixed.casing_normalized +
      autoFixed.currency_or_thousands_parsed +
      autoFixed.null_literals_converted +
      autoFixed.duplicate_rows_dropped +
      autoFixed.missing_values_imputed
    : 0

  const flaggedColumns = useMemo(() => {
    return Array.from(new Set(flaggedItems.map((item) => item.column)))
  }, [flaggedItems])

  const filteredFlagged = useMemo(() => {
    return flaggedItems.filter((item) => {
      const matchesCol = columnFilter === 'all' || item.column === columnFilter
      if (!matchesCol) return false
      if (!auditSearch.trim()) return true
      const q = auditSearch.toLowerCase()
      return (
        item.column.toLowerCase().includes(q) ||
        String(item.original_value).toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        String(item.row_index).includes(q)
      )
    })
  }, [flaggedItems, columnFilter, auditSearch])

  // Filter preview records
  const filteredPreview = useMemo(() => {
    if (!previewSearch.trim()) return cleanedPreview
    const q = previewSearch.toLowerCase()
    return cleanedPreview.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(q)
      )
    )
  }, [cleanedPreview, previewSearch])

  const getDtypeBadge = (dtype: string) => {
    const d = dtype.toLowerCase()
    if (d.includes('int')) return { bg: 'var(--color-info-bg)', border: 'var(--color-info-border)', text: 'var(--color-info-text)' }
    if (d.includes('float')) return { bg: 'var(--color-cyan-bg)', border: 'var(--color-cyan-border)', text: 'var(--color-cyan-text)' }
    if (d.includes('bool')) return { bg: 'var(--color-purple-bg)', border: 'var(--color-purple-border)', text: 'var(--color-purple-text)' }
    if (d.includes('date') || d.includes('time')) return { bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)', text: 'var(--color-warning-text)' }
    return { bg: 'var(--bg-surface2)', border: 'var(--border-subtle)', text: 'var(--text-secondary)' }
  }

  const resolvedHealthScore = useMemo(() => {
    if (healthScore) return healthScore
    if (report?.data_health_score) return report.data_health_score
    if (report?.health_score !== undefined) {
      const s = report.health_score
      return {
        score: s,
        label: report.health_label || (s > 80 ? 'Excellent' : s >= 60 ? 'Good' : 'Needs Review'),
        color: s > 80 ? 'green' : s >= 60 ? 'amber' : 'red',
        penalties: {
          flagged_penalty: Math.min(40, flaggedItems.length * 1.0),
          auto_fixed_penalty: Math.min(20, totalAutoFixed * 0.5),
        },
        total_flagged: flaggedItems.length,
        total_auto_fixed: totalAutoFixed,
      }
    }
    // Fallback computed using user's formula
    const autoPenalty = Math.min(20, totalAutoFixed * 0.5)
    const flaggedPenalty = Math.min(40, flaggedItems.length * 1.0)
    const s = Math.max(0, Math.min(100, Math.round(100 - (autoPenalty + flaggedPenalty))))
    return {
      score: s,
      label: s > 80 ? 'Excellent' : s >= 60 ? 'Good' : 'Needs Review',
      color: s > 80 ? 'green' : s >= 60 ? 'amber' : 'red',
      penalties: {
        flagged_penalty: flaggedPenalty,
        auto_fixed_penalty: autoPenalty,
      },
      total_flagged: flaggedItems.length,
      total_auto_fixed: totalAutoFixed,
    }
  }, [healthScore, report, flaggedItems.length, totalAutoFixed])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      {/* ── 1. ULTRA-COMPACT EXECUTIVE METRIC RIBBON ───────────────────────── */}
      <div
        style={{
          background: 'var(--bg-surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Left: Dataset Identity & Large Health Score Gauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--color-indigo-bg)',
                border: '1px solid var(--color-indigo-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-indigo-text)',
                flexShrink: 0,
              }}
            >
              <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {fileName || 'dataset.csv'}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success-border)',
                    color: 'var(--color-success-text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-success-text)', boxShadow: '0 0 6px var(--color-success-text)' }} />
                  Cleaned
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Deterministic pipeline audit complete &bull; Ready for exploration
              </span>
            </div>
          </div>

          {/* Prominent Large Circular Data Health Score Gauge */}
          <DataHealthScoreGauge healthScore={resolvedHealthScore} size="large" />
        </div>

        {/* Middle: Key Metrics Pill Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Shape */}
          <div
            title="Cleaned Dimensions (Rows × Columns)"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface2)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Dimensions
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {rows} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>×</span> {cols}
              {summary.original_rows !== rows && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                  (orig {summary.original_rows})
                </span>
              )}
            </span>
          </div>

          {/* Duplicates Dropped */}
          <div
            title="Exact duplicate records dropped"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: summary.duplicate_rows_dropped > 0 ? 'var(--color-warning-bg)' : 'var(--bg-surface2)',
              border: `1px solid ${summary.duplicate_rows_dropped > 0 ? 'var(--color-warning-border)' : 'var(--border-subtle)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Duplicates
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: summary.duplicate_rows_dropped > 0 ? 'var(--color-warning-text)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {summary.duplicate_rows_dropped} dropped
            </span>
          </div>

          {/* Missing Imputed */}
          <div
            title="Missing values imputed"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: summary.total_missing_values_filled > 0 ? 'var(--color-cyan-bg)' : 'var(--bg-surface2)',
              border: `1px solid ${summary.total_missing_values_filled > 0 ? 'var(--color-cyan-border)' : 'var(--border-subtle)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Imputed
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: summary.total_missing_values_filled > 0 ? 'var(--color-cyan-text)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {summary.total_missing_values_filled} values
            </span>
          </div>

          {/* Auto-fixes */}
          <div
            title="Safe deterministic auto-fixes applied"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Auto-Fixes
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success-text)', fontFamily: 'var(--font-mono)' }}>
              {totalAutoFixed} applied
            </span>
          </div>

          {/* Flagged Review */}
          <div
            onClick={() => setActiveTab('audit')}
            title="Click to view flagged items"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: flaggedItems.length > 0 ? 'var(--color-error-bg)' : 'var(--bg-surface2)',
              border: `1px solid ${flaggedItems.length > 0 ? 'var(--color-error-border)' : 'var(--border-subtle)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              cursor: 'pointer',
              transition: 'transform 0.15s, border-color 0.15s',
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Review Needed
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: flaggedItems.length > 0 ? 'var(--color-error-text)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {flaggedItems.length} items
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onReset}
            className="btn-ghost"
            style={{ fontSize: 12, padding: '7px 12px' }}
            title="Upload a different dataset"
          >
            <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Another
          </button>
          <button
            onClick={onProceed}
            className="btn-primary"
            style={{ fontSize: 12, padding: '7px 14px' }}
          >
            Proceed to Exploration →
          </button>
        </div>
      </div>

      {/* ── 2. SEGMENTED TAB CONTROL & VIEW MODES ───────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 4,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Tab 1: Audit & Review */}
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: activeTab === 'audit' ? 700 : 500,
              color: activeTab === 'audit' ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: activeTab === 'audit' ? 'var(--bg-surface2)' : 'transparent',
              border: `1px solid ${activeTab === 'audit' ? 'var(--border-strong)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg style={{ width: 15, height: 15, color: 'var(--color-warning-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Audit & Review</span>
            {flaggedItems.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 99,
                  background: 'var(--color-error-bg)',
                  border: '1px solid var(--color-error-border)',
                  color: 'var(--color-error-text)',
                }}
              >
                {flaggedItems.length}
              </span>
            )}
          </button>

          {/* Tab 2: Cleaned Data Preview */}
          <button
            onClick={() => setActiveTab('preview')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: activeTab === 'preview' ? 700 : 500,
              color: activeTab === 'preview' ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: activeTab === 'preview' ? 'var(--bg-surface2)' : 'transparent',
              border: `1px solid ${activeTab === 'preview' ? 'var(--border-strong)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg style={{ width: 15, height: 15, color: 'var(--color-indigo-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Cleaned Data Preview</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 99,
                background: 'var(--color-indigo-bg)',
                border: '1px solid var(--color-indigo-border)',
                color: 'var(--color-indigo-text)',
              }}
            >
              {rows} rows
            </span>
          </button>

          {/* Tab 3: Schema & Profiling */}
          <button
            onClick={() => setActiveTab('schema')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: activeTab === 'schema' ? 700 : 500,
              color: activeTab === 'schema' ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: activeTab === 'schema' ? 'var(--bg-surface2)' : 'transparent',
              border: `1px solid ${activeTab === 'schema' ? 'var(--border-strong)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg style={{ width: 15, height: 15, color: 'var(--color-cyan-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Schema & Profiling</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 99,
                background: 'var(--color-cyan-bg)',
                border: '1px solid var(--color-cyan-border)',
                color: 'var(--color-cyan-text)',
              }}
            >
              {cols} cols
            </span>
          </button>

          {/* Tab 4: Split View */}
          <button
            onClick={() => setActiveTab('split')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: activeTab === 'split' ? 700 : 500,
              color: activeTab === 'split' ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: activeTab === 'split' ? 'var(--bg-surface2)' : 'transparent',
              border: `1px solid ${activeTab === 'split' ? 'var(--border-strong)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg style={{ width: 15, height: 15, color: 'var(--color-purple-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span>Split View</span>
          </button>
        </div>

        {/* Status Hint */}
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {totalAutoFixed} auto-corrected &bull; {flaggedItems.length} awaiting verification
        </span>
      </div>

      {/* ── 3. TAB CONTENT VIEWS ────────────────────────────────────────────── */}

      {/* ── TAB A: AUDIT & REVIEW ─────────────────────────────────────────── */}
      {(activeTab === 'audit' || activeTab === 'split') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* SAFE AUTO-FIXES GRID (Ultra-compact 6-tile strip) */}
          {autoFixed && (
            <div
              style={{
                background: 'var(--bg-surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: 'var(--color-success-bg)',
                      border: '1px solid var(--color-success-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-success-text)',
                    }}
                  >
                    <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Deterministic Transformations Applied ({totalAutoFixed})
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    &mdash; Non-lossy, certified automatic cleanings
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-success-text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ✓ Safe & Verified
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 8,
                }}
              >
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--bg-surface2)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Whitespace Trimmed</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-success-text)' }}>
                    {autoFixed.whitespace_trimmed}
                  </span>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--bg-surface2)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Casing Normalized</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-success-text)' }}>
                    {autoFixed.casing_normalized}
                  </span>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--bg-surface2)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Currency & Numbers</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-success-text)' }}>
                    {autoFixed.currency_or_thousands_parsed}
                  </span>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--bg-surface2)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Null Literals Standardized</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-success-text)' }}>
                    {autoFixed.null_literals_converted}
                  </span>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--bg-surface2)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Exact Duplicates</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-success-text)' }}>
                    {autoFixed.duplicate_rows_dropped}
                  </span>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--bg-surface2)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Missing Imputed</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-success-text)' }}>
                    {autoFixed.missing_values_imputed}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* FLAGGED FOR HUMAN REVIEW TABLE (Full Width, high-contrast, zero wasted space) */}
          <div
            style={{
              background: 'var(--bg-surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            {/* Header & Controls */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: 'var(--bg-surface2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'var(--color-warning-bg)',
                    border: '1px solid var(--color-warning-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-warning-text)',
                    flexShrink: 0,
                  }}
                >
                  <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Flagged for Human Review
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 99,
                        background: 'var(--color-warning-bg)',
                        border: '1px solid var(--color-warning-border)',
                        color: 'var(--color-warning-text)',
                      }}
                    >
                      {flaggedItems.length} items
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Outliers, ambiguous calendar dates, or negative values preserved intact without guessing
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search flagged items..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    style={{
                      fontSize: 12,
                      padding: '5px 10px 5px 28px',
                      borderRadius: 6,
                      background: 'var(--bg-surface1)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      width: 170,
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  <svg
                    style={{ position: 'absolute', left: 8, top: 7, width: 14, height: 14, color: 'var(--text-muted)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Column dropdown */}
                {flaggedColumns.length > 0 && (
                  <select
                    value={columnFilter}
                    onChange={(e) => setColumnFilter(e.target.value)}
                    style={{
                      fontSize: 12,
                      padding: '5px 10px',
                      borderRadius: 6,
                      background: 'var(--bg-surface1)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 500,
                    }}
                  >
                    <option value="all">All Columns ({flaggedItems.length})</option>
                    {flaggedColumns.map((col) => {
                      const count = flaggedItems.filter((i) => i.column === col).length
                      return (
                        <option key={col} value={col}>
                          {col} ({count})
                        </option>
                      )
                    })}
                  </select>
                )}
              </div>
            </div>

            {/* Table */}
            {filteredFlagged.length > 0 ? (
              <div style={{ overflowX: 'auto', maxHeight: activeTab === 'split' ? 320 : 460, overflowY: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-surface2)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <tr style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                      <th style={{ padding: '8px 14px', width: 64, textAlign: 'center' }}>Row</th>
                      <th style={{ padding: '8px 14px', width: 140 }}>Column</th>
                      <th style={{ padding: '8px 14px', width: 180 }}>Original Value</th>
                      <th style={{ padding: '8px 14px' }}>Reason & Pipeline Action</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: 'var(--font-sans)' }}>
                    {filteredFlagged.map((item, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '7px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-warning-text)' }}>
                          #{item.row_index}
                        </td>
                        <td style={{ padding: '7px 14px', fontFamily: 'var(--font-mono)' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'var(--bg-surface2)',
                              border: '1px solid var(--border-medium)',
                              color: 'var(--text-primary)',
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {item.column}
                          </span>
                        </td>
                        <td style={{ padding: '7px 14px', fontFamily: 'var(--font-mono)' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'var(--color-error-bg)',
                              border: '1px solid var(--color-error-border)',
                              color: 'var(--color-error-text)',
                              fontSize: 11,
                              fontWeight: 700,
                              wordBreak: 'break-all',
                            }}
                          >
                            {item.original_value === null ? 'null' : String(item.original_value)}
                          </span>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning-text)', flexShrink: 0 }} />
                            <span>{item.reason}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No flagged items match your filter criteria.
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                padding: '8px 18px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              <span>Showing {filteredFlagged.length} of {flaggedItems.length} review items</span>
              <span style={{ color: 'var(--color-warning-text)', fontWeight: 700 }}>Zero Guessing Policy Enforced</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB B: CLEANED DATA PREVIEW ────────────────────────────────────── */}
      {(activeTab === 'preview' || activeTab === 'split') && (
        <div
          style={{
            background: 'var(--bg-surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'var(--bg-surface2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'var(--color-indigo-bg)',
                  border: '1px solid var(--color-indigo-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-indigo-text)',
                  flexShrink: 0,
                }}
              >
                <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Cleaned Dataset Records
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 99,
                      background: 'var(--color-indigo-bg)',
                      border: '1px solid var(--color-indigo-border)',
                      color: 'var(--color-indigo-text)',
                    }}
                  >
                    Showing {filteredPreview.length} of {summary.cleaned_rows} rows
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Interactive live preview of verified dataset with auto-fixes and imputation applied
                </span>
              </div>
            </div>

            {/* Quick Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search preview rows..."
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
                style={{
                  fontSize: 12,
                  padding: '5px 10px 5px 28px',
                  borderRadius: 6,
                  background: 'var(--bg-surface1)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: 190,
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <svg
                style={{ position: 'absolute', left: 8, top: 7, width: 14, height: 14, color: 'var(--text-muted)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Full-width High Density Grid */}
          <div style={{ overflowX: 'auto', maxHeight: activeTab === 'split' ? 340 : 500, overflowY: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-surface2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <tr style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                  <th style={{ padding: '8px 12px', width: 48, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>#</th>
                  {columns.map((col) => {
                    const badge = getDtypeBadge(col.dtype)
                    return (
                      <th key={col.name} style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            {col.name}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: 'var(--font-mono)',
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: badge.bg,
                              border: `1px solid ${badge.border}`,
                              color: badge.text,
                              fontWeight: 700,
                            }}
                          >
                            {col.dtype}
                          </span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'var(--font-mono)' }}>
                {filteredPreview.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '7px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                      {rIdx + 1}
                    </td>
                    {columns.map((col) => {
                      const val = row[col.name]
                      const isNull = val === null || val === undefined
                      return (
                        <td
                          key={col.name}
                          style={{
                            padding: '7px 14px',
                            whiteSpace: 'nowrap',
                            color: 'var(--text-primary)',
                            fontSize: 12,
                          }}
                        >
                          {isNull ? (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.8 }}>null</span>
                          ) : typeof val === 'number' ? (
                            <span style={{ color: 'var(--color-info-text)', fontWeight: 600 }}>
                              {Number.isInteger(val) ? val : val.toFixed(2)}
                            </span>
                          ) : typeof val === 'boolean' ? (
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                background: val ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                                border: `1px solid ${val ? 'var(--color-success-border)' : 'var(--color-error-border)'}`,
                                color: val ? 'var(--color-success-text)' : 'var(--color-error-text)',
                              }}
                            >
                              {String(val)}
                            </span>
                          ) : (
                            <span>{String(val)}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: '8px 18px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface2)',
              fontSize: 11,
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Showing top {filteredPreview.length} preview records</span>
            <span>Total dataset size: {rows} rows &bull; {cols} columns</span>
          </div>
        </div>
      )}

      {/* ── TAB C: SCHEMA & PROFILING ──────────────────────────────────────── */}
      {(activeTab === 'schema' || activeTab === 'split') && (
        <div
          style={{
            background: 'var(--bg-surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'var(--color-cyan-bg)',
                  border: '1px solid var(--color-cyan-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-cyan-text)',
                  flexShrink: 0,
                }}
              >
                <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Schema & Missing Value Profiling
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 99,
                      background: 'var(--color-cyan-bg)',
                      border: '1px solid var(--color-cyan-border)',
                      color: 'var(--color-cyan-text)',
                    }}
                  >
                    {columns.length} columns profiled
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Inferred data types, null percentage distributions, and automated imputation strategies
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ background: 'var(--bg-surface2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <tr style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                  <th style={{ padding: '8px 14px', width: 48, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>#</th>
                  <th style={{ padding: '8px 14px' }}>Column Name</th>
                  <th style={{ padding: '8px 14px', width: 130 }}>Inferred Dtype</th>
                  <th style={{ padding: '8px 14px', width: 220 }}>Missing Distribution</th>
                  <th style={{ padding: '8px 14px', width: 180 }}>Imputation Strategy</th>
                  <th style={{ padding: '8px 14px', width: 100, textAlign: 'right' }}>Missing %</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col, idx) => {
                  const hasMissing = col.missing_pct > 0
                  const badge = getDtypeBadge(col.dtype)
                  return (
                    <tr
                      key={col.name}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '8px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {col.name}
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.text,
                            fontWeight: 700,
                          }}
                        >
                          {col.dtype}
                        </span>
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 6,
                              borderRadius: 99,
                              background: 'var(--bg-surface3)',
                              overflow: 'hidden',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(col.missing_pct, 100)}%`,
                                borderRadius: 99,
                                background: hasMissing ? 'var(--color-warning-text)' : 'var(--color-success-text)',
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                          {col.missing_count !== undefined && (
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 600, minWidth: 46 }}>
                              {col.missing_count} nulls
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        {col.imputation_strategy && col.imputation_strategy !== 'none' ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: 'var(--font-mono)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'var(--color-indigo-bg)',
                              border: '1px solid var(--color-indigo-border)',
                              color: 'var(--color-indigo-text)',
                              fontWeight: 700,
                            }}
                          >
                            {col.imputation_strategy}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>none</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        <span style={{ color: hasMissing ? 'var(--color-warning-text)' : 'var(--color-success-text)' }}>
                          {col.missing_pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. BOTTOM ACTION STRIP ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 0 6px',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Tip: You can switch between <strong>Audit</strong>, <strong>Data Preview</strong>, and <strong>Schema</strong> tabs above without losing your place.
        </span>
        <button className="btn-primary" onClick={onProceed}>
          Proceed to Exploration →
        </button>
      </div>
    </div>
  )
}
