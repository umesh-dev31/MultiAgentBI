import React, { useEffect, useState } from 'react'
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
  icon: string
  description: string
}

const PIPELINE_STEPS: StepDefinition[] = [
  {
    name: 'Data Cleaning',
    displayName: 'Data Cleaning & Category-Aware Imputation',
    agent: 'Data Agent',
    icon: '🧹',
    description: 'Trims whitespace, resolves types, and imputes missing values using category medians',
  },
  {
    name: 'Validation Gate',
    displayName: 'Quality Audit & Validation Gate',
    agent: 'Validation Gate',
    icon: '🛡️',
    description: 'Enforces threshold integrity and extracts clean validated subset without negative contamination',
  },
  {
    name: 'EDA Analysis',
    displayName: 'Exploratory Data Analysis & Trends',
    agent: 'EDA Agent',
    icon: '📊',
    description: 'Computes descriptive statistics, category distributions, correlation matrix, and monthly trends',
  },
  {
    name: 'ML Analytics',
    displayName: 'Machine Learning & Outlier Detection',
    agent: 'ML Agent',
    icon: '🧠',
    description: 'Fits IsolationForest for anomaly detection and computes linear regression trajectory forecast',
  },
  {
    name: 'Visualization Selection',
    displayName: 'Adaptive Chart Specification',
    agent: 'Visualization Agent',
    icon: '📈',
    description: 'Selects the top 2-3 highest-leverage chart types and produces clean Recharts payloads',
  },
  {
    name: 'Insight Generation',
    displayName: 'Executive Business Summary & Strategy',
    agent: 'Insight Agent',
    icon: '📑',
    description: 'LLM synthesizes managerial briefing with key findings and actionable recommendations',
  },
]

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  isExecuting,
  logs,
  fileName,
}) => {
  const [simulatedStep, setSimulatedStep] = useState(0)

  // When executing, cycle through steps to give dynamic feedback
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
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* Header Banner */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-xl shadow-inner">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold tracking-tight">
                LangGraph Multi-Agent Orchestrator
              </h3>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                  isExecuting
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                }`}
              >
                {isExecuting ? 'PIPELINE RUNNING' : 'PIPELINE COMPLETE'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isExecuting
                ? `Coordinating 6 autonomous agents across parallel execution paths for ${fileName || 'dataset'}`
                : `All 6 agents successfully executed in a single automated pipeline`}
            </p>
          </div>
        </div>

        {!isExecuting && totalDuration > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono">
            <span className="text-indigo-200">Total Duration:</span>
            <span className="font-bold text-white">{totalDuration.toFixed(2)}s</span>
          </div>
        )}
      </div>

      {/* Progress Stepper List */}
      <div className="p-5 divide-y divide-slate-100">
        {PIPELINE_STEPS.map((step, idx) => {
          // Find matching log if available
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
              className={`py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4 transition-all duration-300 ${
                isCurrent ? 'bg-indigo-50/40 -mx-5 px-5 rounded-lg' : ''
              }`}
            >
              {/* Left Column: Icon & Step Info */}
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                    isCompleted && !isCurrent
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : isCurrent
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    '✓'
                  ) : isCurrent ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs sm:text-sm font-semibold tracking-tight ${
                        isCurrent
                          ? 'text-indigo-900 font-bold'
                          : isCompleted
                          ? 'text-slate-900'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.displayName}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {step.agent}
                    </span>
                    {(idx === 2 || idx === 3) && (
                      <span className="text-[10px] font-semibold font-mono px-1.5 py-0.2 rounded bg-violet-50 text-violet-700 border border-violet-200">
                        PARALLEL NODE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate sm:text-clip">
                    {step.description}
                  </p>

                  {/* Log Details if available */}
                  {log && log.details && (
                    <p className="text-[11px] font-mono text-emerald-700 mt-1 bg-emerald-50/70 px-2 py-0.5 rounded border border-emerald-200/50 inline-block">
                      ↳ {log.details}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Status / Timing */}
              <div className="shrink-0 text-right">
                {log ? (
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {log.duration_seconds.toFixed(2)}s
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                      Completed
                    </span>
                  </div>
                ) : isCurrent ? (
                  <span className="text-xs font-bold text-indigo-600 animate-pulse">
                    Running...
                  </span>
                ) : isCompleted ? (
                  <span className="text-xs font-bold text-emerald-600">
                    Done
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
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
