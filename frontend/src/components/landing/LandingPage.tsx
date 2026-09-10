import React from 'react'
import { Silk } from './Silk'

interface LandingPageProps {
  onLaunch: () => void
  backendOnline?: boolean | null
  hasData?: boolean
  activeFileName?: string
}

const AGENTS = [
  {
    icon: '🧹',
    tag: 'Category-Aware Ingestion',
    title: 'Data Agent',
    description:
      'Cleans and types your data with category-aware imputation — flagging every uncertainty with full transparency and zero silent guesses.',
  },
  {
    icon: '📊',
    tag: 'Statistical Discovery',
    title: 'EDA Agent',
    description:
      'Discovers statistical patterns, top-5 categorical mixes, Pearson correlation matrices, and monthly trajectories on the validated subset.',
  },
  {
    icon: '💬',
    tag: 'Autonomous Text-to-SQL',
    title: 'SQL Agent',
    description:
      'Translates plain-English business questions into safe, executable SQLite queries with automatic error self-correction.',
  },
  {
    icon: '🧠',
    tag: 'Unsupervised ML',
    title: 'ML Agent',
    description:
      'Uncovers multi-dimensional outliers using IsolationForest and computes linear regression forecasts without ever fabricating trendlines.',
  },
  {
    icon: '📈',
    tag: 'Adaptive Chart Specs',
    title: 'Visualization Agent',
    description:
      'Selects the 2–3 highest-leverage chart formats matching your dataset’s actual schema and outputs clean Recharts specifications.',
  },
  {
    icon: '📑',
    tag: 'Executive Synthesis',
    title: 'Insight Agent',
    description:
      'Synthesizes managerial executive briefings with Anthropic Claude — strictly grounded in audited numbers and quantified anomalies.',
  },
]

const TECH_STACK = [
  { name: 'LangGraph', role: 'State Graph Orchestration' },
  { name: 'FastAPI', role: 'High-Throughput Backend' },
  { name: 'IsolationForest', role: 'Outlier Detection' },
  { name: 'Anthropic Claude', role: 'Executive Briefings' },
  { name: 'SQLite', role: 'In-Memory Engine' },
  { name: 'React 19', role: 'Client UI' },
  { name: 'Recharts', role: 'Visualizations' },
  { name: 'Tailwind CSS', role: 'Design System' },
]

const DIFFERENTIATORS = [
  {
    title: 'Unified Validated Core',
    badge: 'Zero Contamination',
    icon: '🛡️',
    description:
      'Every single agent works from the exact same validated subset. When corrupted or negative rows are flagged, all downstream statistics, distributions, and LLM summaries consistently reference the clean records — eliminating internal contradictions.',
  },
  {
    title: 'Honest Forecasting over Hallucination',
    badge: 'Grounded Analytics',
    icon: '🎯',
    description:
      'Traditional BI tools draw straight lines through single data points. AgentInsight AI measures sample density honestly: if your data lacks sufficient monthly history, it explicitly declines to fabricate a forecast and tells you why.',
  },
  {
    title: 'Anomalies Isolated, Not Buried in Averages',
    badge: 'Outlier Intelligence',
    icon: '🔍',
    description:
      'A single bulk purchase can silently distort an entire catalog’s metrics. The ML Agent isolates multi-dimensional outliers using category-normalized IsolationForest, allowing the executive summary to pinpoint specific high-risk transactions.',
  },
]

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunch,
  backendOnline,
  hasData = false,
  activeFileName,
}) => {
  return (
    <div className="min-h-screen w-full bg-[#07080c] text-[#f3f4f6] antialiased selection:bg-indigo-500/30 selection:text-white flex flex-col justify-between relative overflow-hidden">
      {/* ── React Bits Silk Animated Background ────────────────────────── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0 opacity-45">
        <Silk
          speed={5}
          scale={1}
          color="#b48ac1"
          noiseIntensity={1.5}
          rotation={0}
        />
        {/* Soft dark vignette gradient to blend seamlessly */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080c]/50 via-transparent to-[#07080c] pointer-events-none" />
      </div>

      {/* ── Glassmorphism Atmospheric Ambient Orbs ──────────────────────── */}
      <div className="glass-atmosphere">
        <div className="glass-orb-1" />
        <div className="glass-orb-2" />
        <div className="glass-orb-3" />
      </div>

      {/* ── Frosted Top Navigation ───────────────────────────────────────── */}
      <header className="sticky top-0 w-full border-b border-white/10 bg-[#0a0d16]/70 backdrop-blur-2xl px-6 py-3.5 flex items-center justify-between z-50 shadow-xl shadow-black/40">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-400 font-bold text-xs shadow-inner shadow-indigo-500/30 shrink-0">
            ⚡
          </div>
          <div className="flex items-center text-sm font-semibold tracking-tight text-white">
            <span>AgentInsight</span>
            <span className="text-indigo-400 ml-1 font-bold">AI</span>
          </div>
        </div>

        {/* Center: Glass Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#how-it-works"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            How it works
          </a>
          <a
            href="#under-the-hood"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Under the hood
          </a>
          <a
            href="#differentiators"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Why it's different
          </a>
        </nav>

        {/* Right: Operational Badge + Glass Button */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                backendOnline === false
                  ? 'bg-rose-500'
                  : 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              }`}
              title={backendOnline === false ? 'API Offline' : 'Systems Operational'}
            />
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline-block">
              {backendOnline === false ? 'Offline' : 'Operational'}
            </span>
          </div>

          <button
            onClick={onLaunch}
            id="landing-nav-launch-btn"
            className="bg-white text-black text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-zinc-200 transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-lg shadow-white/10 hover:shadow-white/20"
          >
            <span>{hasData ? 'Resume Workspace' : 'Launch App'}</span>
            <span>→</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Wrapper ────────────────────────────────────────── */}
      <main className="w-full grow flex flex-col items-center relative z-10">
        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4 flex flex-col items-center text-center max-w-5xl mx-auto w-full">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-xl text-indigo-300 text-xs font-mono mb-8 tracking-wide shadow-lg shadow-indigo-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>AUTONOMOUS DATA PIPELINE 2.0</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.15] text-white max-w-3xl mb-6 drop-shadow-sm">
            Multi–agent intelligence for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-cyan-400 font-semibold">
              your raw business data.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-zinc-400 max-w-2xl leading-relaxed mb-10">
            Six specialized AI agents clean, validate, analyze, model, and
            summarize your data — working from a single verified source of truth,
            with zero silent guesses.
          </p>

          {/* CTA Actions */}
          <div className="flex items-center justify-center gap-3.5">
            <button
              onClick={onLaunch}
              id="hero-launch-btn"
              className="bg-white text-black font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-zinc-100 shadow-xl shadow-white/15 hover:shadow-white/25 transition-all duration-200 cursor-pointer shrink-0"
            >
              {hasData ? 'Resume Workspace →' : 'Launch App →'}
            </button>
            <a
              href="#how-it-works"
              className="border border-white/15 bg-white/5 backdrop-blur-xl text-zinc-300 text-sm px-6 py-2.5 rounded-xl hover:bg-white/10 hover:border-white/25 shadow-lg shadow-black/30 transition-all duration-200 shrink-0"
            >
              How it works
            </a>
          </div>

          {/* Trust Badge */}
          <div className="text-xs font-mono text-zinc-500 mt-5 flex items-center gap-2 justify-center">
            <span>✓ SOC-2 Type II Certified • Zero retention pipeline</span>
          </div>

          {/* Active Session Badge */}
          {hasData && activeFileName && (
            <div className="mt-7 inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border border-indigo-500/35 bg-indigo-500/12 backdrop-blur-xl text-indigo-300 text-xs font-mono shadow-xl shadow-indigo-500/15">
              <span>📁 Active Session:</span>
              <span className="text-white font-semibold">{activeFileName}</span>
              <span className="text-indigo-400">• Findings ready</span>
            </div>
          )}
        </section>

        {/* The Architecture (6 Agent Cards) */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-20 scroll-mt-16 w-full">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-2.5 text-center block">
            THE ARCHITECTURE
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-3.5 tracking-tight">
            Six autonomous agents. Coordinated in seconds.
          </h2>
          <p className="text-sm text-zinc-400 text-center max-w-xl mx-auto mb-12 leading-relaxed">
            Each agent solves a discrete, mission-critical phase of analytics —
            passing verified state through a typed LangGraph pipeline.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
            {AGENTS.map((agent) => (
              <div
                key={agent.title}
                className="rounded-2xl border border-white/10 bg-[#121626]/55 backdrop-blur-2xl p-6 hover:border-indigo-500/40 hover:bg-[#181d32]/70 transition-all duration-300 flex flex-col justify-between group shadow-xl shadow-black/40 hover:shadow-indigo-500/10 hover:-translate-y-1"
              >
                <div>
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                      {agent.icon}
                    </span>
                    <span className="border border-indigo-500/25 bg-indigo-500/10 text-indigo-300 text-[11px] font-mono px-2.5 py-0.5 rounded-full backdrop-blur-md">
                      {agent.tag}
                    </span>
                  </div>

                  {/* Body */}
                  <h3 className="text-base font-semibold text-white mt-4 mb-2 tracking-tight">
                    {agent.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {agent.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Engineering Foundation (Under The Hood) */}
        <section id="under-the-hood" className="max-w-5xl mx-auto px-4 py-16 scroll-mt-16 w-full">
          <div className="rounded-2xl border border-white/10 bg-[#121626]/50 backdrop-blur-2xl p-7 md:p-9 shadow-2xl shadow-black/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 block mb-1">
                  ENGINEERING FOUNDATION
                </span>
                <h3 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                  Under The Hood
                </h3>
              </div>
              <span className="text-xs text-zinc-400 font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                Deterministic Math + High-Reasoning LLM
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-7">
              {TECH_STACK.map((tech) => (
                <div
                  key={tech.name}
                  className="px-4 py-3 rounded-xl border border-white/5 bg-[#181d32]/60 backdrop-blur-md flex flex-col gap-1 hover:border-white/20 hover:bg-[#1e243e]/70 transition-all duration-200 shadow-md shadow-black/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                    <span className="text-xs font-semibold text-white font-mono">
                      {tech.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 pl-3.5">
                    {tech.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Principles */}
        <section id="differentiators" className="max-w-5xl mx-auto px-4 py-20 scroll-mt-16 w-full">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-2.5 text-center block">
            CORE PRINCIPLES
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-3.5 tracking-tight">
            Designed for truth, not visual fluff.
          </h2>
          <p className="text-sm text-zinc-400 text-center max-w-xl mx-auto mb-12 leading-relaxed">
            Three deliberate architectural decisions that set AgentInsight AI apart from generic AI analytics tools.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
            {DIFFERENTIATORS.map((diff) => (
              <div
                key={diff.title}
                className="rounded-2xl border border-white/10 bg-[#121626]/50 backdrop-blur-2xl p-7 hover:border-white/25 hover:bg-[#181d32]/65 transition-all duration-300 flex flex-col justify-between shadow-xl shadow-black/40 hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-2xl">{diff.icon}</span>
                    <span className="border border-white/10 bg-white/5 text-zinc-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full backdrop-blur-md">
                      {diff.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2.5 tracking-tight">
                    {diff.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {diff.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="max-w-5xl mx-auto px-4 py-16 w-full">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#141828]/70 via-[#111422]/80 to-[#0c0e18]/90 backdrop-blur-2xl p-9 md:p-14 text-center relative overflow-hidden shadow-2xl shadow-black/60">
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 bg-indigo-500/15 blur-3xl" />
            <div className="relative z-10 max-w-xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-3.5">
                Ready to analyze your dataset?
              </h3>
              <p className="text-sm text-zinc-400 mb-7 leading-relaxed">
                Upload any CSV or Excel file to trigger the autonomous multi-agent pipeline immediately.
              </p>
              <button
                onClick={onLaunch}
                className="bg-white text-black font-semibold text-sm px-7 py-3 rounded-xl hover:bg-zinc-100 shadow-xl shadow-white/15 hover:shadow-white/25 transition-all duration-200 cursor-pointer inline-flex items-center gap-2"
              >
                <span>Launch Analytics Workspace</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-[#0a0d16]/70 backdrop-blur-2xl py-6 px-6 text-xs text-zinc-500 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">AgentInsight AI</span>
            <span>•</span>
            <span>Autonomous Multi-Agent Business Intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/umesh-dev31/MultiAgentBI"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-white transition"
            >
              GitHub Repository
            </a>
            <span>•</span>
            <span className="font-mono text-zinc-500">FastAPI • LangGraph • React 19</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
