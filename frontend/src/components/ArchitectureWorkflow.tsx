import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'

/*
  High-Contrast Dark & Light Minimalist Bento Architecture:
  Seamless theme-adaptive layout with crisp borders, razor-sharp typography,
  real-time animated SVG data flow pulses, and fast scroll reveal animations.
*/

interface CardDef {
  fig: string
  tag: string
  title: string
  metric: string
  description: string
  colSpan: string
  borderClasses: (isDark: boolean) => string
  graphic: (h: boolean, isDark: boolean) => React.ReactNode
}

const CARDS: CardDef[] = [
  /* ── 01 DATA AGENT ─ wide top-left (2 cols) ────────────────────── */
  {
    fig: 'FIG. 01',
    tag: 'SYS.INGEST',
    title: 'Data Agent',
    metric: '61 AUTO-FIXES APPLIED · 17 FLAGGED FOR REVIEW',
    description: 'Category-aware imputation with complete lineage tracking. Applies deterministic auto-fixes while explicitly isolating unresolved anomalies for human audit.',
    colSpan: 'md:col-span-2',
    borderClasses: (isDark) => `md:border-r md:border-b ${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)')
        : (h ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.35)')
      const fillBox = isDark
        ? (h ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)')
        : (h ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)')
      const textMain = isDark ? '#FFFFFF' : '#0a0a0a'
      const textMuted = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)'

      return (
        <svg viewBox="0 0 460 110" fill="none" className="w-full h-32 sm:h-36 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            {/* Raw input table */}
            <rect x="8" y="8" width="126" height="94" fill={fillBox} strokeWidth="1.2" />
            <line x1="8" y1="32" x2="134" y2="32" strokeWidth="1.2" />
            <line x1="8" y1="53" x2="134" y2="53" />
            <line x1="8" y1="73" x2="134" y2="73" />
            <line x1="48" y1="8" x2="48" y2="102" />
            <line x1="88" y1="8" x2="88" y2="102" />

            {/* Table headers */}
            <text x="14" y="24" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">RAW_ID</text>
            <text x="54" y="24" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">VAL</text>
            <text x="94" y="24" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">FLAG</text>

            {/* Row 1 */}
            <text x="16" y="46" fontSize="9" fill={textMuted} fontFamily="monospace">001</text>
            <text x="54" y="46" fontSize="9" fill={textMuted} fontFamily="monospace">42.5</text>
            <rect x="88" y="32" width="46" height="21" fill={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'} />
            <text x="94" y="46" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.03em">NULL</text>

            {/* Row 2 */}
            <text x="16" y="66" fontSize="9" fill={textMuted} fontFamily="monospace">002</text>
            <text x="54" y="66" fontSize="9" fill={textMuted} fontFamily="monospace">15O0</text>
            <text x="94" y="66" fontSize="9" fill={textMuted} fontFamily="monospace" letterSpacing="0.02em">WARN</text>

            {/* Row 3 */}
            <text x="16" y="88" fontSize="9" fill={textMuted} fontFamily="monospace">003</text>
            <text x="54" y="88" fontSize="9" fill={textMuted} fontFamily="monospace">88.1</text>
            <text x="94" y="88" fontSize="9" fill={textMuted} fontFamily="monospace">OK</text>

            {/* Connection paths with animated flow */}
            {[24, 46, 66, 88].map((y, i) => (
              <path
                key={i}
                d={`M134 ${y} C152 ${y} 158 ${y} 176 ${y}`}
                strokeDasharray="3 2"
                stroke={isDark ? (h ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)') : (h ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)')}
                className="stroke-flow-dash"
              />
            ))}

            {/* Traveling pulse dot 1 */}
            <circle r="2.4" fill={textMain} opacity="0.9">
              <animateMotion dur="2s" repeatCount="indefinite" path="M134 46 C152 46 158 46 176 46" />
            </circle>

            {/* Validator node */}
            <rect x="176" y="8" width="158" height="94" fill={fillBox} strokeWidth="1.2" />
            <line x1="176" y1="32" x2="334" y2="32" strokeWidth="1.2" />
            <text x="185" y="24" fontSize="10" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">SCHEMA_VALIDATOR v2</text>
            <text x="185" y="50" fontSize="9.5" fill={textMuted} fontFamily="monospace" letterSpacing="0.02em">type_check   ✓ pass</text>
            <text x="185" y="69" fontSize="9.5" fill={textMuted} fontFamily="monospace" letterSpacing="0.02em">categorize   ✓ pass</text>
            <text x="185" y="88" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.02em">imputation   → median</text>

            {/* Output lines */}
            {[24, 55, 86].map((y, i) => (
              <path
                key={i}
                d={`M334 ${y} C348 ${y} 354 ${y} 366 ${y}`}
                strokeDasharray="3 2"
                stroke={isDark ? (h ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)') : (h ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)')}
                className="stroke-flow-dash"
              />
            ))}

            {/* Traveling pulse dot 2 */}
            <circle r="2.4" fill={textMain} opacity="0.9">
              <animateMotion dur="1.8s" repeatCount="indefinite" path="M334 55 C348 55 354 55 366 55" />
            </circle>

            {/* Clean output partitions */}
            {[10, 42, 74].map((y, i) => (
              <g key={i}>
                <rect
                  x="366"
                  y={y}
                  width="88"
                  height="25"
                  rx="2"
                  fill={fillBox}
                  strokeWidth="1.2"
                />
                <circle cx="376" cy={y + 12.5} r="3" fill={textMain} />
                <text x="385" y={y + 16.5} fontSize="9" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">
                  {i === 0 ? 'CLEAN_NUM' : i === 1 ? 'CLEAN_CAT' : 'AUDIT_LOG'}
                </text>
              </g>
            ))}
          </g>
        </svg>
      )
    },
  },

  /* ── 02 EDA AGENT ─ top right (1 col) ───────────────────────────── */
  {
    fig: 'FIG. 02',
    tag: 'STAT.DISCOVERY',
    title: 'EDA Agent',
    metric: '3×3 CORRELATION MATRIX · 5 CATEGORICAL BREAKDOWNS',
    description: 'Autonomous Pearson correlation matrix, cyclical monthly trajectories, and true categorical cardinality computation across valid slices.',
    colSpan: 'md:col-span-1',
    borderClasses: (isDark) => `md:border-b ${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)')
        : (h ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.35)')
      const solid = isDark ? '#FFFFFF' : '#0a0a0a'
      const grid = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'
      const textMain = isDark ? '#FFFFFF' : '#0a0a0a'
      const fillBox = isDark ? (h ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)') : (h ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.02)')

      return (
        <svg viewBox="0 0 240 110" fill="none" className="w-full h-32 sm:h-36 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            {/* Axes */}
            <line x1="28" y1="14" x2="28" y2="92" strokeWidth="1.4" stroke={solid} />
            <line x1="28" y1="92" x2="230" y2="92" strokeWidth="1.4" stroke={solid} />

            {/* Axis labels */}
            <text x="28" y="10" fontSize="8.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">METRIC_Y</text>
            <text x="178" y="104" fontSize="8.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">FEATURE_X</text>

            {/* Pearson metric badge */}
            <rect x="36" y="18" width="86" height="19" rx="2" fill={fillBox} stroke={solid} strokeWidth="1.2" />
            <text x="40" y="31.5" fontSize="8.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.03em">PEARSON: COMPUTED</text>

            {/* Grid */}
            {[65, 105, 145, 185].map(x => (
              <line key={x} x1={x} y1="14" x2={x} y2="92" strokeDasharray="2 2" stroke={grid} />
            ))}
            {[40, 66].map(y => (
              <line key={y} x1="28" y1={y} x2="230" y2={y} strokeDasharray="2 2" stroke={grid} />
            ))}

            {/* Scatter points */}
            {[[44, 82], [58, 74], [74, 66], [92, 58], [110, 50], [128, 42], [146, 36], [164, 30], [182, 24]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="3" fill={solid} />
            ))}
            <line x1="36" y1="86" x2="196" y2="20" stroke={solid} strokeWidth="1.8" strokeDasharray={h ? undefined : '4 2'} />

            {/* Traveling data pulse along correlation trendline */}
            <circle r="2.8" fill={solid} opacity="0.9">
              <animateMotion dur="2.4s" repeatCount="indefinite" path="M36 86 L196 20" />
            </circle>

            {/* Animated pulsing outlier radar ring */}
            <circle cx="206" cy="66" r="5" fill="none" stroke={solid} strokeWidth="1.2" strokeDasharray="2 2">
              <animate attributeName="r" values="4;8.5;4" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.85;0.2;0.85" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="206" cy="66" r="2.5" fill={solid} />

            {/* Outlier callout badge */}
            <rect x="150" y="74" width="84" height="20" rx="2" fill={isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)'} stroke={solid} strokeWidth="1.2" />
            <text x="156" y="88" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">OUTLIER [!FLAG]</text>
          </g>
        </svg>
      )
    },
  },

  /* ── 03 SQL AGENT ─ middle left (1 col) ─────────────────────────── */
  {
    fig: 'FIG. 03',
    tag: 'SAFE.SQL',
    title: 'SQL Agent',
    metric: 'SANDBOX: ACTIVE · RECOVERY: AUTO',
    description: 'Natural language translated into sandboxed SQLite with SELECT-only validation and retry-on-error self-correction.',
    colSpan: 'md:col-span-1',
    borderClasses: (isDark) => `md:border-r md:border-b ${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)')
        : (h ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.35)')
      const solid = isDark ? '#FFFFFF' : '#0a0a0a'
      const textMain = isDark ? '#FFFFFF' : '#0a0a0a'
      const textMuted = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)'
      const fillBox = isDark
        ? (h ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)')
        : (h ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)')

      return (
        <svg viewBox="0 0 240 110" fill="none" className="w-full h-32 sm:h-36 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            {/* Terminal box */}
            <rect x="8" y="10" width="108" height="88" fill={fillBox} strokeWidth="1.2" />
            <line x1="8" y1="28" x2="116" y2="28" strokeWidth="1.2" />
            <text x="16" y="23" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.05em">QUERY_CLI</text>
            <path d="M16 42 L22 46 L16 50" strokeWidth="1.4" stroke={solid} />
            <text x="28" y="49" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.02em">SELECT *</text>
            <text x="16" y="66" fontSize="9" fill={textMuted} fontFamily="monospace" letterSpacing="0.02em">WHERE rev &gt; 0</text>
            <text x="16" y="83" fontSize="9" fill={textMuted} fontFamily="monospace" letterSpacing="0.02em">GROUP BY cat</text>

            {/* Connection to node */}
            <path d="M116 46 L140 46" strokeDasharray="2 2" stroke={solid} className="stroke-flow-dash" strokeWidth="1.2" />
            <circle cx="146" cy="46" r="5" fill={solid} />
            <line x1="150" y1="43" x2="172" y2="28" strokeWidth="1.4" stroke={solid} />
            <line x1="150" y1="49" x2="172" y2="64" strokeWidth="1.4" stroke={solid} />

            {/* Target badges */}
            <rect x="172" y="18" width="60" height="21" rx="2" fill={fillBox} stroke={solid} strokeWidth="1.2" />
            <text x="180" y="32.5" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">FILTER</text>

            <rect x="172" y="54" width="60" height="21" rx="2" fill={fillBox} stroke={solid} strokeWidth="1.2" />
            <text x="180" y="68.5" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">GROUP</text>

            {/* Self-correction recovery loop path */}
            <path d="M116 78 C136 98 122 104 96 96 L100 88" strokeDasharray="2 2" stroke={solid} className="stroke-flow-dash" strokeWidth="1.2" />

            {/* Traveling pulses */}
            <circle r="2" fill={solid} opacity="0.9">
              <animateMotion dur="2.1s" repeatCount="indefinite" path="M116 46 L140 46" />
            </circle>
            <circle r="2" fill={solid} opacity="0.85">
              <animateMotion dur="2.8s" repeatCount="indefinite" path="M116 78 C136 98 122 104 96 96 L100 88" />
            </circle>

            {/* Recovery badge */}
            <rect x="116" y="86" width="86" height="19" rx="2" fill={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} stroke={solid} strokeWidth="1" />
            <text x="122" y="99.5" fontSize="8.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">AUTO_RETRY ✓</text>
          </g>
        </svg>
      )
    },
  },

  /* ── 04 ML AGENT ─ middle center (1 col) ────────────────────────── */
  {
    fig: 'FIG. 04',
    tag: 'UNSUPERVISED ML',
    title: 'ML Agent',
    metric: 'ISOLATION FOREST · UNSUPERVISED · SCORE-RANKED',
    description: 'Multi-dimensional anomaly detection via IsolationForest hyperplane slicing. Identifies revenue skews without distorting base averages.',
    colSpan: 'md:col-span-1',
    borderClasses: (isDark) => `md:border-r md:border-b ${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)')
        : (h ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.35)')
      const solid = isDark ? '#FFFFFF' : '#0a0a0a'
      const textMain = isDark ? '#FFFFFF' : '#0a0a0a'
      const textMuted = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)'
      const plane = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
      const fillBox = isDark ? (h ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)') : (h ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.02)')

      return (
        <svg viewBox="0 0 240 110" fill="none" className="w-full h-32 sm:h-36 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            {/* Top Hyperplane badge */}
            <rect x="12" y="10" width="112" height="20" rx="2" fill={fillBox} stroke={solid} strokeWidth="1.2" />
            <text x="18" y="24" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">iFOREST_PLANE</text>

            {/* Hyperplane 3D bounding wireframe */}
            <path d="M22 84 L78 96 L216 62 L158 50 Z" strokeDasharray="3 2" stroke={plane} fill="none" className="stroke-flow-dash" />
            <line x1="78" y1="96" x2="78" y2="28" strokeWidth="1.4" stroke={solid} />

            {/* Cluster points */}
            {[[96, 72], [106, 66], [116, 70], [102, 78], [124, 62], [134, 60], [112, 60], [122, 74]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="3" fill={solid} />
            ))}

            {/* Hyperplane slice line */}
            <line x1="78" y1="78" x2="162" y2="48" stroke={solid} strokeWidth="1.8" />
            <line x1="118" y1="26" x2="168" y2="92" strokeDasharray="3 2" stroke={solid} className="stroke-flow-dash" />

            {/* Hyperplane slice traveling pulse */}
            <circle r="2.4" fill={solid} opacity="0.9">
              <animateMotion dur="2.6s" repeatCount="indefinite" path="M78 78 L162 48" />
            </circle>

            {/* Anomaly detector pulsing rings */}
            <circle cx="188" cy="28" r="5" fill={solid} />
            <circle cx="188" cy="28" r="10" strokeDasharray="2 2" stroke={solid} strokeWidth="1.2" fill="none">
              <animate attributeName="r" values="8;13;8" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.85;0.2;0.85" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Anomaly callout badge */}
            <rect x="136" y="10" width="98" height="22" rx="2" fill={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)'} stroke={solid} strokeWidth="1.2" />
            <text x="142" y="25" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">ANOMALY: 0.89</text>

            {/* Bottom subtitle */}
            <text x="124" y="103" fontSize="8.5" fill={textMuted} fontFamily="monospace" fontWeight="600" letterSpacing="0.03em">CONTAMINATION: auto</text>
          </g>
        </svg>
      )
    },
  },

  /* ── 05 VIZ AGENT ─ middle right (1 col) ────────────────────────── */
  {
    fig: 'FIG. 05',
    tag: 'RECHARTS SPEC',
    title: 'Visualization Agent',
    metric: 'JSX READY · SVG-RENDERED · SCHEMA-DRIVEN',
    description: 'Evaluates schema density to synthesize 2–3 optimal chart layouts. Generates valid React Recharts JSX specs directly without canvas bloat.',
    colSpan: 'md:col-span-1',
    borderClasses: (isDark) => `md:border-b ${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)')
        : (h ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.35)')
      const solid = isDark ? '#FFFFFF' : '#0a0a0a'
      const textMain = isDark ? '#FFFFFF' : '#0a0a0a'
      const textMuted = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)'
      const grid = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'
      const barFill = isDark
        ? (h ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)')
        : (h ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.06)')
      const splineFill = isDark
        ? (h ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.09)')
        : (h ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.06)')

      return (
        <svg viewBox="0 0 240 110" fill="none" className="w-full h-32 sm:h-36 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            {/* Axes */}
            <line x1="24" y1="12" x2="24" y2="88" strokeWidth="1.4" stroke={solid} />
            <line x1="24" y1="88" x2="230" y2="88" strokeWidth="1.4" stroke={solid} />
            <line x1="24" y1="42" x2="230" y2="42" strokeDasharray="2 3" stroke={grid} />
            <line x1="24" y1="65" x2="230" y2="65" strokeDasharray="2 3" stroke={grid} />

            {/* Axis labels */}
            <text x="24" y="9" fontSize="8.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">REV ($k)</text>
            <text x="44" y="101" fontSize="8.5" fill={textMuted} fontFamily="monospace">JAN</text>
            <text x="100" y="101" fontSize="8.5" fill={textMuted} fontFamily="monospace">FEB</text>
            <text x="156" y="101" fontSize="8.5" fill={textMain} fontFamily="monospace" fontWeight="bold">MAR</text>
            <text x="208" y="101" fontSize="8.5" fill={textMuted} fontFamily="monospace">APR</text>

            {/* Bars */}
            {[42, 74, 106, 138, 170, 202].map((x, i) => {
              const heights = [32, 50, 40, 58, 46, 66]
              const ht = heights[i]
              return (
                <rect
                  key={x}
                  x={x - 6}
                  y={88 - ht}
                  width="12"
                  height={ht}
                  fill={barFill}
                  stroke={grid}
                />
              )
            })}

            {/* Spline area */}
            <path
              d="M24 74 Q64 62 104 46 T170 50 T228 26 L228 88 L24 88 Z"
              fill={splineFill}
              stroke="none"
            />
            <path
              d="M24 74 Q64 62 104 46 T170 50 T228 26"
              strokeWidth="2.2"
              stroke={solid}
            />

            {/* Traveling pulse along continuous SVG spline */}
            <circle r="2.8" fill={solid} opacity="0.95">
              <animateMotion dur="2.8s" repeatCount="indefinite" path="M24 74 Q64 62 104 46 T170 50 T228 26" />
            </circle>

            {/* Vertical crosshair & tooltip */}
            <line x1="170" y1="18" x2="170" y2="88" strokeDasharray="2 2" stroke={solid} className="stroke-flow-dash" strokeWidth="1.2" />
            <circle cx="170" cy="50" r="4.5" fill={solid} />
            <rect x="142" y="12" width="56" height="22" rx="3" fill={isDark ? '#000000' : '#ffffff'} stroke={solid} strokeWidth="1.4" />
            <text x="148" y="27" fontSize="10" fill={solid} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">$42.8k</text>
          </g>
        </svg>
      )
    },
  },

  /* ── 06 INSIGHT AGENT ─ bottom full width (3 cols) ──────────────── */
  {
    fig: 'FIG. 06',
    tag: 'CLAUDE SYNTHESIS',
    title: 'Insight Agent',
    metric: 'LLM-SYNTHESIZED · GROUNDED IN AGENT OUTPUTS',
    description: 'Generates an LLM-synthesized summary grounded directly in EDA and ML agent outputs, delivering actionable business takeaways without fabrication.',
    colSpan: 'md:col-span-3',
    borderClasses: (isDark) => `${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)')
        : (h ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.35)')
      const solid = isDark ? '#FFFFFF' : '#0a0a0a'
      const textMain = isDark ? '#FFFFFF' : '#0a0a0a'
      const textMuted = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)'
      const fillBox = isDark
        ? (h ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)')
        : (h ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)')

      return (
        <svg viewBox="0 0 840 96" fill="none" className="w-full h-28 sm:h-32 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            {/* Left Card: Synthesis Report */}
            <rect x="10" y="8" width="205" height="80" fill={fillBox} strokeWidth="1.2" />
            <line x1="10" y1="28" x2="215" y2="28" strokeWidth="1.2" />
            <text x="20" y="22" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">SYNTHESIS_REPORT.MD</text>
            <line x1="20" y1="38" x2="155" y2="38" strokeWidth="1.6" stroke={solid} />
            <line x1="20" y1="49" x2="190" y2="49" strokeDasharray="3 2" className="stroke-flow-dash" />
            <line x1="20" y1="59" x2="170" y2="59" strokeDasharray="3 2" className="stroke-flow-dash" />
            <rect x="20" y="68" width="185" height="15" rx="2" fill={isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'} stroke="none" />
            <text x="26" y="79" fontSize="8" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.03em">AUDIT_GROUNDED: 42 TRANSACTIONS</text>

            {/* Connectors to intermediate metrics */}
            <path d="M215 32 L250 32" strokeDasharray="2 2" stroke={solid} className="stroke-flow-dash" strokeWidth="1.2" />
            <path d="M215 64 L250 64" strokeDasharray="2 2" stroke={solid} className="stroke-flow-dash" strokeWidth="1.2" />

            {/* Traveling dots into intermediate metric nodes */}
            <circle r="2" fill={solid} opacity="0.9">
              <animateMotion dur="1.9s" repeatCount="indefinite" path="M215 32 L250 32" />
            </circle>
            <circle r="2" fill={solid} opacity="0.9">
              <animateMotion dur="2.3s" repeatCount="indefinite" path="M215 64 L250 64" />
            </circle>

            {/* Intermediate metric nodes */}
            <g>
              <rect x="250" y="14" width="145" height="32" rx="2" fill={fillBox} strokeWidth="1.2" />
              <text x="258" y="27" fontSize="9" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.03em">ANOMALY_COUNT: 3</text>
              <text x="258" y="39" fontSize="8" fill={textMuted} fontFamily="monospace" letterSpacing="0.02em">MAX_SCORE: 100%</text>
            </g>
            <g>
              <rect x="250" y="50" width="145" height="32" rx="2" fill={fillBox} strokeWidth="1.2" />
              <text x="258" y="63" fontSize="9" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.03em">PEARSON_CORR: COMPUTED</text>
              <text x="258" y="75" fontSize="8" fill={textMuted} fontFamily="monospace" letterSpacing="0.02em">FORECAST: CONFIDENCE-GATED</text>
            </g>

            {/* Connecting lines from metrics to briefing */}
            <path d="M395 30 L425 30" strokeDasharray="2 2" stroke={solid} className="stroke-flow-dash" strokeWidth="1.2" />
            <path d="M395 66 L425 66" strokeDasharray="2 2" stroke={solid} className="stroke-flow-dash" strokeWidth="1.2" />
            <circle r="2" fill={solid} opacity="0.9">
              <animateMotion dur="1.7s" repeatCount="indefinite" path="M395 30 L425 30" />
            </circle>
            <circle r="2" fill={solid} opacity="0.9">
              <animateMotion dur="2.1s" repeatCount="indefinite" path="M395 66 L425 66" />
            </circle>

            {/* Right Card: Executive Briefing */}
            <rect x="425" y="8" width="405" height="80" fill={fillBox} strokeWidth="1.2" />
            <line x1="425" y1="28" x2="830" y2="28" strokeWidth="1.2" />
            <text x="438" y="22" fontSize="9.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">
              EXECUTIVE ACTIONABLE BRIEFING // AUDITED OUTPUT
            </text>
            {[42, 56, 70].map((y, i) => (
              <g key={i}>
                <circle cx="442" cy={y} r="2.5" fill={solid} />
                <line x1="452" y1={y} x2={670 - i * 30} y2={y} strokeDasharray="3 2" className="stroke-flow-dash" />
              </g>
            ))}
            <rect x="686" y="34" width="134" height="18" rx="2" fill={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'} stroke={solid} strokeWidth="1" />
            <text x="694" y="47" fontSize="8.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">INPUT: ML_RESULT</text>
            <rect x="686" y="56" width="134" height="18" rx="2" fill={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'} stroke={solid} strokeWidth="1" />
            <text x="694" y="69" fontSize="8.5" fill={textMain} fontFamily="monospace" fontWeight="bold" letterSpacing="0.04em">INPUT: EDA_RESULT</text>
          </g>
        </svg>
      )
    },
  },
]

/* ─ Single Card Component with Scroll-Triggered Reveal ─────────────────── */
interface CardProps {
  card: CardDef
  index: number
  hovered: number | null
  onHover: (i: number | null) => void
  isDark: boolean
}

const Card: React.FC<CardProps> = ({ card, index, hovered, onHover, isDark }) => {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const isH = hovered === index
  const dim = hovered !== null && !isH

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      style={{
        transitionDuration: '300ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${Math.min(index * 60, 240)}ms`,
      }}
      className={`group relative flex flex-col cursor-default p-6
        ${card.colSpan}
        ${card.borderClasses(isDark)}
        ${isDark ? 'bg-black' : 'bg-white'}
        ${dim ? 'opacity-40' : ''}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        transition-all
        ${isH ? (isDark ? 'bg-white/[0.04]' : 'bg-black/[0.02]') : (isDark ? 'hover:bg-white/[0.015]' : 'hover:bg-black/[0.01]')}
      `}
    >
      {/* Corner crosshairs indicator on hover */}
      {isH && (
        <>
          <span className={`absolute top-1 left-1 text-[10px] font-mono select-none ${isDark ? 'text-white/40' : 'text-black/30'}`}>+</span>
          <span className={`absolute top-1 right-1 text-[10px] font-mono select-none ${isDark ? 'text-white/40' : 'text-black/30'}`}>+</span>
          <span className={`absolute bottom-1 left-1 text-[10px] font-mono select-none ${isDark ? 'text-white/40' : 'text-black/30'}`}>+</span>
          <span className={`absolute bottom-1 right-1 text-[10px] font-mono select-none ${isDark ? 'text-white/40' : 'text-black/30'}`}>+</span>
        </>
      )}

      {/* Top bar: Figure identifier + Technical Tag */}
      <div className="flex items-center justify-between pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`} />
          <span className={`text-[11px] font-mono tracking-widest font-semibold ${isDark ? 'text-white/70' : 'text-black/60'}`}>{card.fig}</span>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 tracking-wider transition-colors ${isDark
            ? 'border border-white/20 bg-white/[0.05] text-white/80 group-hover:border-white/50 group-hover:text-white'
            : 'border border-black/15 bg-black/[0.04] text-neutral-800 group-hover:border-black/30 group-hover:text-black'
          }`}>
          [{card.tag}]
        </span>
      </div>

      {/* Title */}
      <div className="pb-2 shrink-0">
        <h3 className={`text-base sm:text-lg font-bold tracking-tight transition-colors ${isDark ? 'text-white group-hover:text-white' : 'text-neutral-950 group-hover:text-black'}`}>
          {card.title}
        </h3>
      </div>

      {/* Technical Schematic Graphic */}
      <div className="py-2 flex-1 flex flex-col justify-center">
        <div className="transition-all duration-300 rounded overflow-hidden">
          {card.graphic(isH, isDark)}
        </div>
      </div>

      {/* Description */}
      <div className="pt-3 pb-2 shrink-0">
        <p className={`text-[13px] leading-relaxed font-normal ${isDark ? 'text-white/70' : 'text-neutral-600'}`}>
          {card.description}
        </p>
      </div>

      {/* Bottom Metric Bar */}
      <div className={`pt-3 mt-auto shrink-0 border-t ${isDark ? 'border-white/15' : 'border-black/10'}`}>
        <span className={`text-[11px] font-mono tracking-wider transition-colors ${isDark ? 'text-white/60 group-hover:text-white' : 'text-neutral-500 group-hover:text-neutral-900'}`}>
          {card.metric}
        </span>
      </div>
    </div>
  )
}

/* ─ Main Component ─────────────────────────────────────────────────────── */
export const ArchitectureWorkflow: React.FC = () => {
  const [hovered, setHovered] = useState<number | null>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section
      id="how-it-works"
      className={`py-24 px-6 border-t scroll-mt-16 transition-colors ${isDark ? 'bg-black border-white/15' : 'bg-[#fafafc] border-black/10'
        }`}
    >
      {/* SVG animation styles for data flow pulses */}
      <style>{`
        @keyframes strokeDashFlow {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        .stroke-flow-dash {
          animation: strokeDashFlow 2.4s linear infinite;
        }
      `}</style>

      <div className="max-w-6xl mx-auto">

        {/* Section Header */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className={`text-[11px] font-mono tracking-widest uppercase mb-2 ${isDark ? 'text-white/60' : 'text-neutral-500'}`}>
              Architecture
            </p>
            <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-950'}`}>
              Six autonomous agents.{' '}
              <span className={isDark ? 'text-white/50' : 'text-neutral-500'}>One unified pipeline.</span>
            </h2>
          </div>
          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-md shrink-0 ${isDark ? 'border-white/20 bg-white/[0.04]' : 'border-black/15 bg-black/[0.03]'
            }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-white' : 'bg-black'}`} />
            <span className={`text-[12px] font-mono tracking-wide ${isDark ? 'text-white/80' : 'text-neutral-800'}`}>
              6/6 agents active
            </span>
          </div>
        </div>

        {/* Bento Grid Canvas */}
        <div className={`border grid grid-cols-1 md:grid-cols-3 ${isDark ? 'border-white/15 bg-black' : 'border-black/10 bg-white shadow-sm'
          }`}>
          {CARDS.map((card, i) => (
            <Card key={card.fig} card={card} index={i} hovered={hovered} onHover={setHovered} isDark={isDark} />
          ))}
        </div>

        {/* Bottom Annotation */}
        <div className={`mt-4 flex items-center justify-between text-[11px] font-mono ${isDark ? 'text-white/40' : 'text-neutral-500'
          }`}>
          <span>PIPELINE_TOPOLOGY: DETERMINISTIC_DAG</span>
          <span>EXECUTION_MODEL: LANGGRAPH_COMPILED</span>
        </div>

      </div>
    </section>
  )
}

export default ArchitectureWorkflow

