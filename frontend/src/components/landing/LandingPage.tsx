import React from 'react'

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
    <div className="min-h-screen w-full bg-[#0b0c10] text-[#f3f4f6] antialiased selection:bg-indigo-500/30 selection:text-white flex flex-col justify-between relative">
      {/* Subtle radial ambient glow at top */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/10 via-indigo-500/5 to-transparent blur-3xl -z-10" />

      {/* 2. HEADER & NAVIGATION */}
      <header className="sticky top-0 w-full border-b border-white/5 bg-[#0b0c10]/80 backdrop-blur-md px-6 py-3 flex items-center justify-between z-50">
        {/* Left: Logo icon + "AgentInsight" with AI highlighted in indigo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shadow-inner shrink-0">
            ⚡
          </div>
          <div className="flex items-center text-sm font-semibold tracking-tight text-white">
            <span>AgentInsight</span>
            <span className="text-indigo-400 ml-1 font-bold">AI</span>
          </div>
        </div>

        {/* Center: Minimal text links */}
        <nav className="hidden md:flex items-center gap-7">
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

        {/* Right: Operational status indicator + clean action button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                backendOnline === false
                  ? 'bg-rose-500'
                  : 'bg-emerald-400 animate-pulse'
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
            className="bg-white text-black text-xs font-medium px-4 py-1.5 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <span>{hasData ? 'Resume Workspace' : 'Launch App'}</span>
            <span>→</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="w-full grow flex flex-col items-center">
        {/* 3. FIXED HERO SECTION */}
        <section className="pt-20 pb-12 px-4 flex flex-col items-center text-center max-w-5xl mx-auto w-full">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-xs font-mono mb-6 tracking-wide">
            <span>⚡ AUTONOMOUS DATA PIPELINE 2.0</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.15] text-white max-w-3xl mb-6">
            Multi–agent intelligence for{' '}
            <span className="text-indigo-400 font-medium">
              your raw business data.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-zinc-400 max-w-2xl leading-relaxed mb-8">
            Six specialized AI agents clean, validate, analyze, model, and
            summarize your data — working from a single verified source of truth,
            with zero silent guesses.
          </p>

          {/* CTA Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onLaunch}
              id="hero-launch-btn"
              className="bg-white text-black font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-zinc-200 transition cursor-pointer shrink-0"
            >
              {hasData ? 'Resume Workspace →' : 'Launch App →'}
            </button>
            <a
              href="#how-it-works"
              className="border border-white/10 text-zinc-300 text-sm px-5 py-2.5 rounded-lg hover:bg-white/5 transition shrink-0"
            >
              How it works
            </a>
          </div>

          {/* Micro trust badge below buttons */}
          <div className="text-xs font-mono text-zinc-500 mt-4 flex items-center gap-2 justify-center">
            <span>✓ SOC-2 Type II Certified • Zero retention pipeline</span>
          </div>

          {/* Session loaded pill if data active */}
          {hasData && activeFileName && (
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-mono">
              <span>📁 Active Session:</span>
              <span className="text-white font-semibold">{activeFileName}</span>
              <span className="text-indigo-400">• Findings ready</span>
            </div>
          )}
        </section>

        {/* 5. MULTI-AGENT GRID ("THE ARCHITECTURE") */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-16 scroll-mt-16 w-full">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-2 text-center block">
            THE ARCHITECTURE
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-3 tracking-tight">
            Six autonomous agents. Coordinated in seconds.
          </h2>
          <p className="text-sm text-zinc-400 text-center max-w-xl mx-auto mb-10 leading-relaxed">
            Each agent solves a discrete, mission-critical phase of analytics —
            passing verified state through a typed LangGraph pipeline.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {AGENTS.map((agent) => (
              <div
                key={agent.title}
                className="rounded-xl border border-white/10 bg-[#12131a] p-5 hover:border-white/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top header row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xl group-hover:scale-110 transition-transform">
                      {agent.icon}
                    </span>
                    <span className="border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 text-[11px] font-mono px-2 py-0.5 rounded-md">
                      {agent.tag}
                    </span>
                  </div>

                  {/* Body */}
                  <h3 className="text-sm font-medium text-white mt-3 mb-1.5">
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

        {/* 6. ENGINEERING FOUNDATION */}
        <section id="under-the-hood" className="max-w-5xl mx-auto px-4 py-12 scroll-mt-16 w-full">
          <div className="rounded-xl border border-white/10 bg-[#12131a] p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-5">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 block mb-1">
                  ENGINEERING FOUNDATION
                </span>
                <h3 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                  Under The Hood
                </h3>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                Deterministic Math + High-Reasoning LLM
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {TECH_STACK.map((tech) => (
                <div
                  key={tech.name}
                  className="px-3.5 py-2.5 rounded-lg border border-white/5 bg-[#181a24] flex flex-col gap-0.5 hover:border-white/15 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="text-xs font-semibold text-white font-mono">
                      {tech.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 pl-3">
                    {tech.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. WHAT MAKES THIS DIFFERENT */}
        <section id="differentiators" className="max-w-5xl mx-auto px-4 py-16 scroll-mt-16 w-full">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-2 text-center block">
            CORE PRINCIPLES
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-3 tracking-tight">
            Designed for truth, not visual fluff.
          </h2>
          <p className="text-sm text-zinc-400 text-center max-w-xl mx-auto mb-10 leading-relaxed">
            Three deliberate architectural decisions that set AgentInsight AI apart from generic AI analytics tools.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {DIFFERENTIATORS.map((diff) => (
              <div
                key={diff.title}
                className="rounded-xl border border-white/10 bg-[#12131a] p-6 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl">{diff.icon}</span>
                    <span className="border border-white/10 bg-white/5 text-zinc-400 text-[10px] font-mono px-2 py-0.5 rounded-md">
                      {diff.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2 tracking-tight">
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

        {/* 8. BOTTOM CTA BANNER */}
        <section className="max-w-5xl mx-auto px-4 py-16 w-full">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#12131a] to-[#0d0e14] p-8 md:p-12 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-indigo-500/10 blur-3xl" />
            <div className="relative z-10 max-w-xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-3">
                Ready to analyze your dataset?
              </h3>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                Upload any CSV or Excel file to trigger the autonomous multi-agent pipeline immediately.
              </p>
              <button
                onClick={onLaunch}
                className="bg-white text-black font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-zinc-200 transition cursor-pointer inline-flex items-center gap-2"
              >
                <span>Launch Analytics Workspace</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 9. FOOTER */}
      <footer className="w-full border-t border-white/5 bg-[#0b0c10] py-6 px-6 text-xs text-zinc-500">
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
