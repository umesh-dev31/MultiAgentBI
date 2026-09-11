import React, { useEffect, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import type { PipelineExecutionLog } from '../../types/data'

interface PipelineProgressProps {
  isExecuting: boolean
  logs?: PipelineExecutionLog[]
  fileName?: string
}

interface StepDefinition {
  name: string
  displayName: string
  agent: string
  idx: string
  description: string
}

const PIPELINE_STEPS: StepDefinition[] = [
  {
    name: 'Data Cleaning',
    displayName: 'Data Cleaning & Category-Aware Imputation',
    agent: 'Data Agent',
    idx: '01',
    description: 'Trims whitespace, resolves types, and imputes missing values using category medians',
  },
  {
    name: 'Validation Gate',
    displayName: 'Quality Audit & Validation Gate',
    agent: 'Validation Gate',
    idx: '02',
    description: 'Enforces threshold integrity and extracts clean validated subset without contamination',
  },
  {
    name: 'EDA Analysis',
    displayName: 'Exploratory Data Analysis & Trends',
    agent: 'EDA Agent',
    idx: '03',
    description: 'Computes descriptive statistics, category distributions, correlation matrix, and monthly trends',
  },
  {
    name: 'ML Analytics',
    displayName: 'Machine Learning & Outlier Detection',
    agent: 'ML Agent',
    idx: '04',
    description: 'Fits IsolationForest for anomaly detection and computes linear regression trajectory forecast',
  },
  {
    name: 'Visualization Selection',
    displayName: 'Adaptive Chart Specification',
    agent: 'Visualization Agent',
    idx: '05',
    description: 'Selects the top 2-3 highest-leverage chart types and produces clean Recharts payloads',
  },
  {
    name: 'Insight Generation',
    displayName: 'Executive Business Summary & Strategy',
    agent: 'Insight Agent',
    idx: '06',
    description: 'LLM synthesizes managerial briefing with key findings and actionable recommendations',
  },
]

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  isExecuting,
  logs,
  fileName,
}) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [simulatedStep, setSimulatedStep] = useState(0)

  useEffect(() => {
    if (!isExecuting) {
      setSimulatedStep(PIPELINE_STEPS.length)
      return
    }

    setSimulatedStep(0)
    const interval = setInterval(() => {
      setSimulatedStep((prev) => {
        if (prev < PIPELINE_STEPS.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 1200)

    return () => clearInterval(interval)
  }, [isExecuting])

  const totalDuration = logs
    ? logs.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0)
    : 0

  return (
    <div className={`w-full rounded-xl overflow-hidden border transition-colors ${
      isDark ? 'bg-black border-white/15' : 'bg-white border-black/10 shadow-sm'
    }`}>
      {/* Header Banner */}
      <div className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDark ? 'border-white/15 bg-white/[0.02]' : 'border-black/10 bg-neutral-50'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded border flex items-center justify-center font-mono font-bold text-xs ${
            isDark ? 'border-white/20 bg-white/[0.05] text-white' : 'border-black/15 bg-black/[0.04] text-neutral-900'
          }`}>
            DAG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                LangGraph Multi-Agent Orchestrator
              </h3>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                  isExecuting
                    ? (isDark ? 'bg-white/10 text-white border-white/30 animate-pulse' : 'bg-neutral-200 text-neutral-900 border-neutral-300 animate-pulse')
                    : (isDark ? 'bg-white/10 text-white border-white/20' : 'bg-neutral-100 text-neutral-800 border-neutral-200')
                }`}
              >
                {isExecuting ? 'PIPELINE RUNNING' : 'PIPELINE COMPLETE'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-white/60' : 'text-neutral-500'}`}>
              {isExecuting
                ? `Coordinating six autonomous agents for ${fileName || 'dataset'}`
                : `All six agents executed through single unified pipeline`}
            </p>
          </div>
        </div>

        {!isExecuting && totalDuration > 0 && (
          <div className={`flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded border text-xs font-mono ${
            isDark ? 'bg-white/[0.05] border-white/15' : 'bg-neutral-100 border-neutral-200'
          }`}>
            <span className={isDark ? 'text-white/60' : 'text-neutral-500'}>Total Duration:</span>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>{totalDuration.toFixed(2)}s</span>
          </div>
        )}
      </div>

      {/* Progress Stepper List */}
      <div className={`p-5 divide-y ${isDark ? 'divide-white/10' : 'divide-neutral-200'}`}>
        {PIPELINE_STEPS.map((step, idx) => {
          const log = logs?.find(
            (l) =>
              l.step_name.toLowerCase().includes(step.name.toLowerCase()) ||
              step.name.toLowerCase().includes(l.step_name.toLowerCase())
          )

          const isCompleted = !isExecuting || (logs && log) || idx < simulatedStep
          const isCurrent = isExecuting && idx === simulatedStep

          return (
            <div
              key={step.name}
              className={`py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4 transition-all duration-200 ${
                isCurrent ? (isDark ? 'bg-white/[0.03] -mx-5 px-5 rounded' : 'bg-neutral-100/60 -mx-5 px-5 rounded') : ''
              }`}
            >
              {/* Left Column */}
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-all ${
                    isCompleted && !isCurrent
                      ? (isDark ? 'border border-white/30 bg-white/10 text-white' : 'border border-neutral-300 bg-neutral-100 text-neutral-900')
                      : isCurrent
                      ? (isDark ? 'border border-white bg-white text-black' : 'border border-black bg-black text-white')
                      : (isDark ? 'border border-white/10 bg-white/[0.02] text-white/40' : 'border border-neutral-200 bg-neutral-50 text-neutral-400')
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    '✓'
                  ) : isCurrent ? (
                    <span className={`w-3 h-3 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-black' : 'border-white'}`} />
                  ) : (
                    step.idx
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs sm:text-sm font-semibold tracking-tight ${
                        isCurrent
                          ? (isDark ? 'text-white font-bold' : 'text-neutral-950 font-bold')
                          : isCompleted
                          ? (isDark ? 'text-white' : 'text-neutral-900')
                          : (isDark ? 'text-white/50' : 'text-neutral-400')
                      }`}
                    >
                      {step.displayName}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      isDark ? 'bg-white/[0.05] text-white/70 border-white/15' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                    }`}>
                      {step.agent}
                    </span>
                    {(idx === 2 || idx === 3) && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isDark ? 'bg-white/[0.08] text-white border-white/20' : 'bg-neutral-200 text-neutral-800 border-neutral-300'
                      }`}>
                        PARALLEL
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed truncate sm:text-clip ${
                    isDark ? 'text-white/60' : 'text-neutral-500'
                  }`}>
                    {step.description}
                  </p>

                  {log && log.details && (
                    <p className={`text-[11px] font-mono mt-1 px-2 py-0.5 rounded border inline-block ${
                      isDark ? 'text-white/90 bg-white/[0.04] border-white/15' : 'text-neutral-800 bg-neutral-100 border-neutral-200'
                    }`}>
                      ↳ {log.details}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="shrink-0 text-right">
                {log ? (
                  <div className="flex flex-col items-end">
                    <span className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      {log.duration_seconds.toFixed(2)}s
                    </span>
                    <span className={`text-[10px] font-mono font-semibold uppercase tracking-wide ${isDark ? 'text-white/70' : 'text-neutral-500'}`}>
                      Done
                    </span>
                  </div>
                ) : isCurrent ? (
                  <span className={`text-xs font-mono font-bold animate-pulse ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Running...
                  </span>
                ) : isCompleted ? (
                  <span className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Done
                  </span>
                ) : (
                  <span className={`text-xs font-mono ${isDark ? 'text-white/30' : 'text-neutral-400'}`}>
                    Pending
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PipelineProgress
