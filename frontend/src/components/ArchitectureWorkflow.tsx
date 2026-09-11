import React, { useState } from 'react'
import { useTheme } from '../context/ThemeContext'

/*
  High-Contrast Dark & Light Minimalist Bento Architecture:
  Seamless theme-adaptive layout with crisp borders, razor-sharp typography,
  and zero decorative traffic light clutter.
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
    metric: 'AUDIT: 100% VERIFIED',
    description: 'Category-aware imputation with complete lineage tracking. Detects type mismatches, null frequencies, and corrupt records before passing clean arrays downstream.',
    colSpan: 'md:col-span-2',
    borderClasses: (isDark) => `md:border-r md:border-b ${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)')
        : (h ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)')
      const fillBox = isDark
        ? (h ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)')
        : (h ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.01)')
      const textMain = isDark ? '#FFFFFF' : '#000000'
      const textMuted = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'

      return (
        <svg viewBox="0 0 420 90" fill="none" className="w-full h-24 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            {/* Raw input table */}
            <rect x="10" y="10" width="100" height="70" fill={fillBox} />
            <line x1="10" y1="26" x2="110" y2="26" strokeWidth="1.2" />
            <line x1="10" y1="44" x2="110" y2="44" />
            <line x1="10" y1="60" x2="110" y2="60" />
            <line x1="42" y1="10" x2="42" y2="80" />
            <line x1="74" y1="10" x2="74" y2="80" />
            {/* Table headers */}
            <text x="14" y="21" fontSize="6.5" fill={textMuted} fontFamily="monospace" fontWeight="600">RAW_ID</text>
            <text x="46" y="21" fontSize="6.5" fill={textMuted} fontFamily="monospace" fontWeight="600">VAL</text>
            <text x="78" y="21" fontSize="6.5" fill={textMuted} fontFamily="monospace" fontWeight="600">FLAG</text>
            {/* Highlighted anomaly cells */}
            <rect x="74" y="26" width="36" height="18" fill={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'} />
            <text x="78" y="38" fontSize="7" fill={textMain} fontFamily="monospace" fontWeight="bold">NULL</text>
            <text x="78" y="54" fontSize="7" fill={textMuted} fontFamily="monospace">15O0</text>
            <text x="78" y="72" fontSize="7" fill={textMuted} fontFamily="monospace">OK</text>

            {/* Connection paths */}
            {[20, 36, 52, 68].map((y, i) => (
              <path
                key={i}
                d={`M110 ${y} C132 ${y} 140 ${y} 158 ${y}`}
                strokeDasharray="3 2"
                stroke={isDark ? (h ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)') : (h ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.2)')}
              />
            ))}

            {/* Validator node */}
            <rect x="158" y="10" width="124" height="70" fill={fillBox} strokeWidth="1.2" />
            <line x1="158" y1="26" x2="282" y2="26" strokeWidth="1.2" />
            <text x="166" y="21" fontSize="7" fill={textMain} fontFamily="monospace" fontWeight="bold">SCHEMA_VALIDATOR v2</text>
            <text x="166" y="40" fontSize="6.5" fill={textMuted} fontFamily="monospace">type_check  ✓ pass</text>
            <text x="166" y="53" fontSize="6.5" fill={textMuted} fontFamily="monospace">categorize  ✓ pass</text>
            <text x="166" y="66" fontSize="6.5" fill={textMain} fontFamily="monospace" fontWeight="600">imputation  → median</text>

            {/* Output lines */}
            {[24, 48, 68].map((y, i) => (
              <path
                key={i}
                d={`M282 ${y} C302 ${y} 310 ${y} 328 ${y}`}
                strokeDasharray="3 2"
                stroke={isDark ? (h ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)') : (h ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.25)')}
              />
            ))}

            {/* Clean output partitions */}
            {[10, 36, 62].map((y, i) => (
              <g key={i}>
                <rect
                  x="328"
                  y={y}
                  width="84"
                  height="18"
                  fill={fillBox}
                  strokeWidth="1"
                />
                <circle cx="338" cy={y + 9} r="2.5" fill={textMain} />
                <text x="346" y={y + 12} fontSize="6" fill={textMain} fontFamily="monospace" fontWeight="500">
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
    metric: 'P-VAL < 0.001 · R²: 0.94',
    description: 'Autonomous Pearson correlation matrix, cyclical monthly trajectories, and true categorical cardinality computation across valid slices.',
    colSpan: 'md:col-span-1',
    borderClasses: (isDark) => `md:border-b ${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)')
        : (h ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)')
      const solid = isDark ? '#FFFFFF' : '#000000'
      const grid = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'

      return (
        <svg viewBox="0 0 200 90" fill="none" className="w-full h-24 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            <line x1="24" y1="12" x2="24" y2="78" strokeWidth="1.2" stroke={solid} />
            <line x1="24" y1="78" x2="186" y2="78" strokeWidth="1.2" stroke={solid} />
            {[55, 90, 125, 160].map(x => (
              <line key={x} x1={x} y1="12" x2={x} y2="78" strokeDasharray="2 2" stroke={grid} />
            ))}
            {[30, 52].map(y => (
              <line key={y} x1="24" y1={y} x2="186" y2={y} strokeDasharray="2 2" stroke={grid} />
            ))}
            {[[38,70],[48,64],[62,56],[78,50],[92,44],[106,38],[120,32],[135,26],[150,22]].map(([cx,cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="2.5" fill={solid} />
            ))}
            <line x1="30" y1="74" x2="165" y2="16" stroke={solid} strokeWidth="1.5" strokeDasharray={h ? undefined : '4 2'} />
            <circle cx="170" cy="58" r="4.5" fill="none" stroke={solid} strokeWidth="1.2" strokeDasharray="2 2" />
            <circle cx="170" cy="58" r="2" fill={solid} />
            <text x="145" y="68" fontSize="6" fill={solid} fontFamily="monospace" fontWeight="bold">OUTLIER</text>
          </g>
        </svg>
      )
    },
  },

  /* ── 03 SQL AGENT ─ middle left (1 col) ─────────────────────────── */
  {
    fig: 'FIG. 03',
    tag: 'AST.SQL',
    title: 'SQL Agent',
    metric: 'SANDBOX: ACTIVE · RECOVERY: AUTO',
    description: 'Natural language translated into sandboxed SQLite with AST validation and an autonomous syntax self-correction loop.',
    colSpan: 'md:col-span-1',
    borderClasses: (isDark) => `md:border-r md:border-b ${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)')
        : (h ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)')
      const solid = isDark ? '#FFFFFF' : '#000000'
      const fillBox = isDark
        ? (h ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)')
        : (h ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.01)')

      return (
        <svg viewBox="0 0 200 90" fill="none" className="w-full h-24 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            <rect x="10" y="10" width="85" height="70" fill={fillBox} />
            <line x1="10" y1="24" x2="95" y2="24" strokeWidth="1.2" />
            <text x="16" y="20" fontSize="6" fill={solid} fontFamily="monospace">QUERY_CLI</text>
            <path d="M16 35 L22 39 L16 43" strokeWidth="1.2" stroke={solid} />
            <line x1="26" y1="39" x2="52" y2="39" strokeWidth="1.2" stroke={solid} />
            <line x1="16" y1="50" x2="84" y2="50" strokeDasharray="3 2" />
            <line x1="16" y1="60" x2="72" y2="60" strokeDasharray="3 2" />
            <line x1="16" y1="70" x2="60" y2="70" strokeDasharray="3 2" />

            <path d="M95 45 L118 45" strokeDasharray="2 2" stroke={solid} />
            <circle cx="124" cy="45" r="4.5" fill={solid} />
            <line x1="128" y1="42" x2="145" y2="28" strokeWidth="1.2" stroke={solid} />
            <line x1="128" y1="48" x2="145" y2="62" strokeWidth="1.2" stroke={solid} />
            <circle cx="150" cy="26" r="3.5" fill="none" stroke={solid} strokeWidth="1.2" />
            <circle cx="150" cy="64" r="3.5" fill="none" stroke={solid} strokeWidth="1.2" />
            <text x="158" y="29" fontSize="6" fill={solid} fontFamily="monospace">WHERE</text>
            <text x="158" y="67" fontSize="6" fill={solid} fontFamily="monospace">GROUP</text>

            <path d="M95 65 C108 78 98 84 86 76 L88 70" strokeDasharray="2 2" stroke={solid} />
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
    metric: 'ISOLATION FOREST · R² AUDITED',
    description: 'Multi-dimensional anomaly detection via IsolationForest hyperplane slicing. Identifies revenue skews without distorting base averages.',
    colSpan: 'md:col-span-1',
    borderClasses: (isDark) => `md:border-r md:border-b ${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)')
        : (h ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)')
      const solid = isDark ? '#FFFFFF' : '#000000'
      const plane = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'

      return (
        <svg viewBox="0 0 200 90" fill="none" className="w-full h-24 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            <path d="M20 72 L70 82 L180 50 L130 38 Z" strokeDasharray="3 2" stroke={plane} fill="none" />
            <line x1="70" y1="82" x2="70" y2="24" strokeWidth="1.2" stroke={solid} />
            {[[84,64],[94,58],[102,62],[90,70],[110,54],[118,52],[98,52],[108,66]].map(([cx,cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="2.5" fill={solid} />
            ))}
            <line x1="70" y1="68" x2="138" y2="44" stroke={solid} strokeWidth="1.5" />
            <line x1="104" y1="20" x2="146" y2="80" strokeDasharray="3 2" stroke={solid} />
            <circle cx="158" cy="22" r="5" fill={solid} />
            <circle cx="158" cy="22" r="10" strokeDasharray="2 2" stroke={solid} strokeWidth="1.2" fill="none" />
            <text x="142" y="12" fontSize="6.5" fill={solid} fontFamily="monospace" fontWeight="bold">ANOMALY 0.89</text>
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
    metric: 'JSX READY · ZERO CANVAS LAG',
    description: 'Evaluates schema density to synthesize 2–3 optimal chart layouts. Generates valid React Recharts JSX specs directly without canvas bloat.',
    colSpan: 'md:col-span-1',
    borderClasses: (isDark) => `md:border-b ${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)')
        : (h ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)')
      const solid = isDark ? '#FFFFFF' : '#000000'
      const grid = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
      const barFill = isDark
        ? (h ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)')
        : (h ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.04)')
      const splineFill = isDark
        ? (h ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)')
        : (h ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.04)')

      return (
        <svg viewBox="0 0 200 90" fill="none" className="w-full h-24 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            <line x1="18" y1="12" x2="18" y2="76" strokeWidth="1.2" stroke={solid} />
            <line x1="18" y1="76" x2="188" y2="76" strokeWidth="1.2" stroke={solid} />
            <line x1="18" y1="36" x2="188" y2="36" strokeDasharray="2 3" stroke={grid} />
            <line x1="18" y1="56" x2="188" y2="56" strokeDasharray="2 3" stroke={grid} />

            {[32, 60, 88, 116, 144, 172].map((x, i) => {
              const heights = [28, 44, 34, 52, 40, 58]
              const ht = heights[i]
              return (
                <rect
                  key={x}
                  x={x - 5}
                  y={76 - ht}
                  width="10"
                  height={ht}
                  fill={barFill}
                  stroke={grid}
                />
              )
            })}

            <path
              d="M18 64 Q50 54 80 42 T135 46 T185 24 L185 76 L18 76 Z"
              fill={splineFill}
              stroke="none"
            />
            <path
              d="M18 64 Q50 54 80 42 T135 46 T185 24"
              strokeWidth="2"
              stroke={solid}
            />

            <line x1="135" y1="18" x2="135" y2="76" strokeDasharray="2 2" stroke={solid} />
            <circle cx="135" cy="46" r="4" fill={solid} />
            <rect x="114" y="10" width="44" height="15" fill={isDark ? '#000000' : '#ffffff'} stroke={solid} strokeWidth="1.2" />
            <text x="120" y="21" fontSize="6.5" fill={solid} fontFamily="monospace" fontWeight="bold">$42.8k</text>
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
    metric: 'ZERO FABRICATION · CITATION TRACEABLE',
    description: 'Executive briefing synthesizer powered by Claude 3.5 Sonnet. Back-references every finding to exact row counts, distribution quartiles, and machine learning anomalies.',
    colSpan: 'md:col-span-3',
    borderClasses: (isDark) => `${isDark ? 'border-white/15' : 'border-black/10'}`,
    graphic: (h, isDark) => {
      const strokeMain = isDark
        ? (h ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)')
        : (h ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)')
      const solid = isDark ? '#FFFFFF' : '#000000'
      const fillBox = isDark
        ? (h ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)')
        : (h ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.01)')
      const textMuted = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'

      return (
        <svg viewBox="0 0 820 76" fill="none" className="w-full h-20 select-none">
          <g strokeWidth="1" stroke={strokeMain}>
            <rect x="12" y="8" width="180" height="60" fill={fillBox} strokeWidth="1.2" />
            <line x1="12" y1="22" x2="192" y2="22" strokeWidth="1.2" />
            <text x="22" y="18" fontSize="6.5" fill={solid} fontFamily="monospace" fontWeight="bold">SYNTHESIS_REPORT.MD</text>
            <line x1="22" y1="32" x2="130" y2="32" strokeWidth="1.5" stroke={solid} />
            <line x1="22" y1="42" x2="175" y2="42" strokeDasharray="3 2" />
            <line x1="22" y1="50" x2="160" y2="50" strokeDasharray="3 2" />
            <rect x="22" y="58" width="156" height="7" fill={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'} stroke="none" />
            <text x="28" y="64" fontSize="5" fill={solid} fontFamily="monospace" fontWeight="bold">AUDIT_GROUNDED: 42 TRANSACTIONS</text>

            {[32, 48].map((y, i) => (
              <path key={i} d={`M192 ${y} L232 ${y}`} strokeDasharray="2 2" stroke={solid} />
            ))}

            <g>
              <rect x="232" y="18" width="130" height="22" fill={fillBox} strokeWidth="1" />
              <text x="240" y="29" fontSize="6" fill={solid} fontFamily="monospace" fontWeight="bold">ANOMALY_COUNT: 4</text>
              <text x="240" y="37" fontSize="5.5" fill={textMuted} fontFamily="monospace">MAX_SCORE: 0.847</text>
            </g>
            <g>
              <rect x="232" y="46" width="130" height="22" fill={fillBox} strokeWidth="1" />
              <text x="240" y="57" fontSize="6" fill={solid} fontFamily="monospace" fontWeight="bold">PEARSON_CORR: 0.91</text>
              <text x="240" y="65" fontSize="5.5" fill={textMuted} fontFamily="monospace">P_VALUE: 0.003</text>
            </g>

            <rect x="380" y="8" width="428" height="60" fill={fillBox} strokeWidth="1.2" />
            <line x1="380" y1="22" x2="808" y2="22" strokeWidth="1.2" />
            <text x="392" y="18" fontSize="6.5" fill={solid} fontFamily="monospace" fontWeight="bold">
              EXECUTIVE ACTIONABLE BRIEFING // AUDITED OUTPUT
            </text>
            {[30, 42, 54].map((y, i) => (
              <g key={i}>
                <circle cx="396" cy={y} r="2" fill={solid} />
                <line x1="404" y1={y} x2={690 - i * 35} y2={y} strokeDasharray="3 2" />
              </g>
            ))}
            <rect x="710" y="26" width="88" height="14" fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'} stroke={solid} strokeWidth="1" />
            <text x="716" y="36" fontSize="5.5" fill={solid} fontFamily="monospace" fontWeight="bold">REF: ML_NODE[0]</text>
            <rect x="710" y="46" width="88" height="14" fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'} stroke={solid} strokeWidth="1" />
            <text x="716" y="56" fontSize="5.5" fill={solid} fontFamily="monospace" fontWeight="bold">REF: EDA_NODE[0]</text>
          </g>
        </svg>
      )
    },
  },
]

/* ─ Single Card Component ─────────────────────────────────────────────── */
interface CardProps {
  card: CardDef
  index: number
  hovered: number | null
  onHover: (i: number | null) => void
  isDark: boolean
}

const Card: React.FC<CardProps> = ({ card, index, hovered, onHover, isDark }) => {
  const isH = hovered === index
  const dim = hovered !== null && !isH

  return (
    <div
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      className={`group relative flex flex-col transition-all duration-300 cursor-default p-6
        ${card.colSpan}
        ${card.borderClasses(isDark)}
        ${isDark ? 'bg-black' : 'bg-white'}
        ${dim ? 'opacity-40' : 'opacity-100'}
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
        <span className={`text-[10px] font-mono px-2 py-0.5 tracking-wider transition-colors ${
          isDark
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
      className={`py-24 px-6 border-t scroll-mt-16 transition-colors ${
        isDark ? 'bg-black border-white/15' : 'bg-[#fafafc] border-black/10'
      }`}
    >
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
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-md shrink-0 ${
            isDark ? 'border-white/20 bg-white/[0.04]' : 'border-black/15 bg-black/[0.03]'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-white' : 'bg-black'}`} />
            <span className={`text-[12px] font-mono tracking-wide ${isDark ? 'text-white/80' : 'text-neutral-800'}`}>
              6/6 agents active
            </span>
          </div>
        </div>

        {/* Bento Grid Canvas */}
        <div className={`border grid grid-cols-1 md:grid-cols-3 ${
          isDark ? 'border-white/15 bg-black' : 'border-black/10 bg-white shadow-sm'
        }`}>
          {CARDS.map((card, i) => (
            <Card key={card.fig} card={card} index={i} hovered={hovered} onHover={setHovered} isDark={isDark} />
          ))}
        </div>

        {/* Bottom Annotation */}
        <div className={`mt-4 flex items-center justify-between text-[11px] font-mono ${
          isDark ? 'text-white/40' : 'text-neutral-500'
        }`}>
          <span>PIPELINE_TOPOLOGY: DETERMINISTIC_DAG</span>
          <span>EXECUTION_MODEL: LANGGRAPH_COMPILED</span>
        </div>

      </div>
    </section>
  )
}

export default ArchitectureWorkflow
