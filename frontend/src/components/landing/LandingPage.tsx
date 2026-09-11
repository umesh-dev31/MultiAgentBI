import React, { useState, useEffect } from 'react'
import ArchitectureWorkflow from '../ArchitectureWorkflow'
import { ThemeToggle } from '../ThemeToggle'
import { useTheme } from '../../context/ThemeContext'

interface LandingPageProps {
  onLaunch: () => void
  backendOnline?: boolean | null
  hasData?: boolean
  activeFileName?: string
}

const TECH_STACK = [
  { name: 'LangGraph', role: 'State graph orchestration', badge: 'DAG' },
  { name: 'FastAPI', role: 'High-throughput async backend', badge: 'API' },
  { name: 'IsolationForest', role: 'Unsupervised outlier detection', badge: 'ML' },
  { name: 'Anthropic Claude', role: 'Executive synthesis LLM', badge: 'GEN-AI' },
  { name: 'SQLite', role: 'In-process isolated query engine', badge: 'SQL' },
  { name: 'React 19', role: 'Concurrent UI runtime', badge: 'UI' },
  { name: 'Recharts', role: 'Vector SVG visualization layer', badge: 'VIZ' },
  { name: 'Tailwind CSS', role: 'Utility design system', badge: 'CSS' },
]

const PRINCIPLES = [
  {
    label: '01',
    title: 'Unified validated core',
    body: 'Every downstream agent reads from the identical validated dataset. Outliers and format corruptions are audited once at ingestion — ensuring zero conflicting statistics across summary cards, distributions, and executive briefs.',
  },
  {
    label: '02',
    title: 'Zero-fabrication forecasting',
    body: 'Traditional BI tools force continuous trendlines through sparse dates. AgentInsight measures sample density deterministically: when data is insufficient, it transparently declines to fabricate false projections.',
  },
  {
    label: '03',
    title: 'Multi-dimensional anomaly detection',
    body: 'Bulk transactions and wholesale anomalies silently distort catalog averages. IsolationForest hyperplanes isolate genuine multi-feature outliers so your standard KPIs reflect authentic operational realities.',
  },
]

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunch,
  backendOnline,
  hasData = false,
  activeFileName,
}) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [liveOnline, setLiveOnline] = useState<boolean | null>(backendOnline ?? null)

  useEffect(() => {
    if (backendOnline !== undefined && backendOnline !== null) setLiveOnline(backendOnline)
  }, [backendOnline])

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 2000)
        let ok = false
        try { const r = await fetch('http://localhost:8000/health', { signal: ctrl.signal }); ok = r.ok }
        catch { try { const r2 = await fetch('http://127.0.0.1:8000/health', { signal: ctrl.signal }); ok = r2.ok } catch { ok = false } }
        finally { clearTimeout(t) }
        if (mounted) setLiveOnline(ok)
      } catch { if (mounted) setLiveOnline(false) }
    }
    check()
    const iv = setInterval(check, 3000)
    return () => { mounted = false; clearInterval(iv) }
  }, [])

  const statusText = liveOnline === true ? 'SYSTEM ONLINE' : liveOnline === false ? 'OFFLINE' : 'CONNECTING'

  return (
    <div className={`min-h-screen w-full antialiased flex flex-col transition-colors duration-200 ${
      isDark ? 'bg-black text-white selection:bg-white selection:text-black' : 'bg-[#fcfcfd] text-neutral-900 selection:bg-black selection:text-white'
    }`}>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 w-full backdrop-blur-md border-b transition-colors ${
        isDark ? 'bg-black/95 border-white/15' : 'bg-white/95 border-black/10'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* Monochrome Logo & Wordmark */}
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 border flex items-center justify-center rounded-sm ${
              isDark ? 'border-white/40 bg-white/10' : 'border-black/30 bg-black/5'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-xs ${isDark ? 'bg-white' : 'bg-black'}`} />
            </div>
            <span className={`text-[14px] font-bold tracking-tight select-none ${
              isDark ? 'text-white' : 'text-neutral-950'
            }`}>
              AgentInsight AI
            </span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8">
            {[['#how-it-works','Architecture'],['#under-the-hood','Stack'],['#differentiators','Principles']].map(([href,label]) => (
              <a
                key={href}
                href={href}
                className={`text-[13px] font-medium transition-colors ${
                  isDark ? 'text-white/70 hover:text-white' : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right Actions: Status + Theme Toggle + Launch */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1 border rounded ${
              isDark ? 'border-white/15 bg-white/[0.04]' : 'border-black/10 bg-black/[0.03]'
            }`}>
              <span
                className={`w-2 h-2 rounded-full ${
                  liveOnline === true
                    ? (isDark ? 'bg-white shadow-[0_0_8px_#fff]' : 'bg-black shadow-[0_0_8px_rgba(0,0,0,0.4)]')
                    : liveOnline === false
                    ? 'bg-red-500'
                    : 'bg-neutral-400 animate-pulse'
                }`}
              />
              <span className={`text-[11px] font-mono tracking-wider ${
                isDark ? 'text-white/80' : 'text-neutral-700'
              }`}>
                {statusText}
              </span>
            </div>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            <button
              onClick={onLaunch}
              id="landing-nav-launch-btn"
              className={`h-8 px-4 text-[13px] font-semibold rounded transition-all cursor-pointer ${
                isDark
                  ? 'bg-white text-black hover:bg-neutral-200'
                  : 'bg-black text-white hover:bg-neutral-800'
              }`}
            >
              {hasData ? 'Resume Workspace →' : 'Launch →'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-28 pb-24 max-w-4xl mx-auto w-full">

        {/* Eyebrow Badge */}
        <div className={`inline-flex items-center gap-2.5 mb-8 px-4 py-1.5 rounded-full border ${
          isDark ? 'border-white/20 bg-white/[0.06] text-white/90' : 'border-black/15 bg-black/[0.04] text-neutral-800'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDark ? 'bg-white' : 'bg-black'}`} />
          <span className="text-[12px] font-mono tracking-wide">
            Autonomous Multi-Agent Business Intelligence
          </span>
        </div>

        {/* Headline */}
        <h1 className={`text-4xl sm:text-6xl md:text-[68px] font-extrabold tracking-tight leading-[1.06] mb-7 ${
          isDark ? 'text-white' : 'text-neutral-950'
        }`}>
          Multi-agent intelligence <br className="hidden sm:block" />
          for enterprise data.
        </h1>

        {/* Subheadline with high-contrast readability */}
        <p className={`text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed mb-12 font-normal ${
          isDark ? 'text-white/75' : 'text-neutral-600'
        }`}>
          Six specialized agents clean, validate, statistically explore, model, and synthesize your raw datasets —
          governed by an audited single source of truth with zero hallucinations.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onLaunch}
            id="hero-launch-btn"
            className={`h-12 px-8 text-[15px] font-bold rounded-lg transition-all cursor-pointer ${
              isDark
                ? 'bg-white text-black hover:bg-neutral-200 shadow-[0_0_40px_rgba(255,255,255,0.15)]'
                : 'bg-black text-white hover:bg-neutral-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)]'
            }`}
          >
            {hasData ? 'Resume Active Workspace →' : 'Launch Application →'}
          </button>
          <a
            href="#how-it-works"
            className={`h-12 px-8 text-[15px] font-medium border rounded-lg transition-all flex items-center justify-center ${
              isDark
                ? 'border-white/25 text-white hover:bg-white/10 hover:border-white/50'
                : 'border-black/20 text-neutral-800 hover:bg-black/5 hover:border-black/40'
            }`}
          >
            Explore Architecture
          </a>
        </div>

        {/* Caption */}
        <p className={`mt-8 text-[12px] font-mono tracking-wider ${
          isDark ? 'text-white/50' : 'text-neutral-400'
        }`}>
          FASTAPI · LANGGRAPH · ANTHROPIC CLAUDE · RECHARTS · SQLITE
        </p>

        {/* Active session reminder */}
        {hasData && activeFileName && (
          <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-mono ${
            isDark ? 'border-white/20 bg-white/[0.05] text-white/90' : 'border-black/15 bg-black/[0.03] text-neutral-900'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`} />
            <span>Active Dataset: <strong className="underline">{activeFileName}</strong></span>
          </div>
        )}
      </section>

      {/* ── 6-Agent Bento Grid (Architecture) ─────────────────────────── */}
      <ArchitectureWorkflow />

      {/* ── Tech Stack ────────────────────────────────────────────────── */}
      <section id="under-the-hood" className={`py-24 px-6 border-t scroll-mt-16 transition-colors ${
        isDark ? 'border-white/15 bg-black' : 'border-black/10 bg-[#fafafc]'
      }`}>
        <div className="max-w-6xl mx-auto">

          {/* Section Header */}
          <div className="mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className={`text-[11px] font-mono tracking-widest uppercase mb-2 ${
                isDark ? 'text-white/60' : 'text-neutral-500'
              }`}>
                Engineering Stack
              </p>
              <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}>
                Deterministic computation +{' '}
                <span className={isDark ? 'text-white/50' : 'text-neutral-500'}>grounded reasoning.</span>
              </h2>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-md shrink-0 ${
              isDark ? 'border-white/20 bg-white/[0.04]' : 'border-black/15 bg-black/[0.03]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`} />
              <span className={`text-[12px] font-mono ${isDark ? 'text-white/80' : 'text-neutral-800'}`}>
                8 production modules
              </span>
            </div>
          </div>

          {/* Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border ${
            isDark ? 'border-white/15 bg-black' : 'border-black/10 bg-white shadow-sm'
          }`}>
            {TECH_STACK.map((t, i) => (
              <div
                key={t.name}
                className={`group relative p-6 border-b sm:border-r transition-colors last:border-b-0 sm:last:border-r-0 ${
                  isDark
                    ? 'border-white/15 hover:bg-white/[0.03]'
                    : 'border-black/10 hover:bg-black/[0.02]'
                }`}
                style={{
                  borderRight: (i + 1) % 4 === 0 ? 'none' : undefined,
                  borderBottom: i >= 4 ? 'none' : undefined,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {t.name}
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 border ${
                    isDark ? 'border-white/20 text-white/70 bg-white/[0.05]' : 'border-black/15 text-neutral-700 bg-black/[0.04]'
                  }`}>
                    {t.badge}
                  </span>
                </div>
                <p className={`text-[13px] leading-relaxed ${isDark ? 'text-white/70' : 'text-neutral-600'}`}>
                  {t.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Principles ───────────────────────────────────────────── */}
      <section id="differentiators" className={`py-24 px-6 scroll-mt-16 border-t transition-colors ${
        isDark ? 'border-white/15 bg-black' : 'border-black/10 bg-[#fafafc]'
      }`}>
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-12">
            <p className={`text-[11px] font-mono tracking-widest uppercase mb-2 ${
              isDark ? 'text-white/60' : 'text-neutral-500'
            }`}>
              Design Philosophy
            </p>
            <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-neutral-950'
            }`}>
              Engineered for mathematical truth,{' '}
              <span className={isDark ? 'text-white/50' : 'text-neutral-500'}>not vanity metrics.</span>
            </h2>
          </div>

          {/* 3-column grid */}
          <div className={`grid grid-cols-1 md:grid-cols-3 border ${
            isDark ? 'border-white/15 bg-black' : 'border-black/10 bg-white shadow-sm'
          }`}>
            {PRINCIPLES.map((p) => (
              <div
                key={p.label}
                className={`group p-8 transition-colors border-b md:border-b-0 md:border-r last:border-b-0 md:last:border-r-0 ${
                  isDark
                    ? 'border-white/15 hover:bg-white/[0.03]'
                    : 'border-black/10 hover:bg-black/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-[12px] font-mono font-semibold tracking-wider ${
                    isDark ? 'text-white/60' : 'text-neutral-500'
                  }`}>
                    [{p.label}]
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`} />
                </div>
                <h3 className={`text-lg font-bold mb-3 tracking-tight ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                  {p.title}
                </h3>
                <p className={`text-[14px] leading-relaxed ${isDark ? 'text-white/70' : 'text-neutral-600'}`}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className={`py-24 px-6 border-t transition-colors ${
        isDark ? 'border-white/15 bg-black' : 'border-black/10 bg-white'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className={`border p-12 md:p-16 flex flex-col items-center text-center gap-6 rounded-lg ${
            isDark ? 'border-white/15 bg-white/[0.015]' : 'border-black/10 bg-[#fafafc] shadow-sm'
          }`}>
            <span className={`text-[11px] font-mono tracking-widest uppercase ${
              isDark ? 'text-white/60' : 'text-neutral-500'
            }`}>
              GET STARTED
            </span>
            <h2 className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-neutral-950'
            }`}>
              Ready to analyze your dataset?
            </h2>
            <p className={`text-base sm:text-lg max-w-lg leading-relaxed ${
              isDark ? 'text-white/75' : 'text-neutral-600'
            }`}>
              Upload any CSV or Excel file. The six-agent pipeline coordinates immediately with zero complex configuration.
            </p>

            <button
              onClick={onLaunch}
              id="cta-launch-btn"
              className={`mt-3 h-13 px-10 text-[15px] font-bold rounded-lg transition-all cursor-pointer ${
                isDark
                  ? 'bg-white text-black hover:bg-neutral-200 shadow-[0_0_50px_rgba(255,255,255,0.18)]'
                  : 'bg-black text-white hover:bg-neutral-800 shadow-[0_4px_24px_rgba(0,0,0,0.15)]'
              }`}
            >
              Launch Analytics Workspace →
            </button>

            {hasData && activeFileName && (
              <p className={`text-[12px] font-mono ${isDark ? 'text-white/60' : 'text-neutral-500'}`}>
                Current dataset: <strong className={isDark ? 'text-white' : 'text-neutral-900'}>{activeFileName}</strong>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className={`border-t py-8 px-6 transition-colors ${
        isDark ? 'border-white/15 bg-black' : 'border-black/10 bg-white'
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`} />
            <span className={`text-[13px] font-medium ${isDark ? 'text-white/70' : 'text-neutral-700'}`}>
              AgentInsight AI · Autonomous Multi-Agent BI
            </span>
          </div>
          <div className={`flex items-center gap-6 text-[13px] ${isDark ? 'text-white/60' : 'text-neutral-500'}`}>
            <a
              href="https://github.com/umesh-dev31/MultiAgentBI"
              target="_blank"
              rel="noreferrer"
              className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-neutral-950'}`}
            >
              GitHub Source →
            </a>
            <span>FastAPI · LangGraph · React 19 · Claude 3.5</span>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage
