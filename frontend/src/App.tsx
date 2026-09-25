import { useEffect, useState } from 'react'
import { LandingPage } from './components/landing/LandingPage'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { CenterCanvas } from './components/dashboard/CenterCanvas'
import { UploadSection } from './components/upload/UploadSection'
import { DataQualityView } from './components/DataQualityView'
import { NotablePatterns } from './components/eda/NotablePatterns'
import { EDASummarySection } from './components/eda/EDASummarySection'
import { CategoricalDistributions } from './components/eda/CategoricalDistributions'
import { CorrelationMatrix } from './components/eda/CorrelationMatrix'
import { MonthlyTrendChart } from './components/eda/MonthlyTrendChart'
import { AskQuestionView } from './components/sql/AskQuestionView'
import { MLInsightsView } from './components/ml/MLInsightsView'
import { BusinessSummaryView } from './components/insights/BusinessSummaryView'
import { HistoryView } from './components/history/HistoryView'
import type {
  EDAResponse,
  UploadResponse,
  PipelineExecutionLog,
  PipelineRunResponse,
} from './types/data'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? ''

type ActiveTab = 'upload' | 'quality' | 'eda' | 'sql' | 'ml' | 'insights' | 'history'
type AppView = 'landing' | 'dashboard'

function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') === 'dashboard' || params.get('tab')) return 'dashboard'
    } catch {}
    return 'landing'
  })
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('tab') as ActiveTab
      if (t && ['upload', 'quality', 'eda', 'sql', 'ml', 'insights', 'history'].includes(t)) {
        return t
      }
    } catch {}
    return 'upload'
  })
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [edaLoading, setEdaLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState<string>('')
  const [datasetResult, setDatasetResult] = useState<UploadResponse | null>(null)
  const [edaResult, setEdaResult] = useState<EDAResponse | null>(null)
  const [mlResult, setMlResult] = useState<any>(null)
  const [insightsResult, setInsightsResult] = useState<any>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<any[] | null>(null)
  const [pipelineLogs, setPipelineLogs] = useState<PipelineExecutionLog[] | undefined>(undefined)
  const [currentRunId, setCurrentRunId] = useState<string | undefined>(undefined)
  const [currentDatasetId, setCurrentDatasetId] = useState<number | null>(null)
  const [historyLoadingId, setHistoryLoadingId] = useState<number | null>(null)

  // Verify backend health on mount and periodically
  const checkHealth = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      let ok = false
      try {
        const res = await fetch(`${BACKEND_URL}/health`, { signal: controller.signal })
        ok = res.ok
      } catch {
        // Fallback to 127.0.0.1 only in local dev (VITE_BACKEND_URL is set)
        if (import.meta.env.VITE_BACKEND_URL) {
          try {
            const fallbackRes = await fetch('http://127.0.0.1:8000/health', { signal: controller.signal })
            ok = fallbackRes.ok
          } catch {
            ok = false
          }
        } else {
          ok = false
        }
      } finally {
        clearTimeout(timeoutId)
      }

      setBackendOnline(ok)
    } catch {
      if (!uploading) {
        setBackendOnline(false)
      }
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleUploadFile = async (file: File) => {
    setError(null)
    setUploading(true)
    setActiveFileName(file.name)
    setPipelineLogs(undefined)

    const runId = 'run_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
    setCurrentRunId(runId)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${BACKEND_URL}/api/pipeline/run?run_id=${runId}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = `Pipeline run failed with HTTP ${response.status}`
        try {
          const errJson = await response.json()
          if (errJson?.detail) errorMessage = errJson.detail
        } catch {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data: PipelineRunResponse = await response.json()

      setBackendOnline(true)
      if (data.dataset_id) setCurrentDatasetId(data.dataset_id)
      setPipelineLogs(data.execution_logs || [])
      setDatasetResult(data.dataset_summary)
      setEdaResult(data.eda_result)
      setMlResult(data.ml_result)
      setSuggestedQuestions(data.suggested_questions || null)

      const combinedInsights = {
        ...(data.insight_result || {}),
        charts: data.visualization_result?.charts || [],
      }
      setInsightsResult(combinedInsights)

      // Brief grace period allowing the user to view all 6 stages marked "Done" on the checklist
      setTimeout(() => {
        setActiveTab('quality')
      }, 1200)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while processing the dataset.'
      )
      setDatasetResult(null)
      setEdaResult(null)
      setMlResult(null)
      setInsightsResult(null)
      setSuggestedQuestions(null)
      setCurrentDatasetId(null)
    } finally {
      setUploading(false)
    }
  }

  const handleLoadHistoricalDataset = async (datasetId: number) => {
    setError(null)
    setHistoryLoadingId(datasetId)
    try {
      const response = await fetch(`${BACKEND_URL}/api/history/${datasetId}`)
      if (!response.ok) {
        let errorMessage = `Failed to load history dataset (HTTP ${response.status})`
        try {
          const errJson = await response.json()
          if (errJson?.detail) errorMessage = errJson.detail
        } catch {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data: PipelineRunResponse = await response.json()
      setBackendOnline(true)
      setCurrentDatasetId(data.dataset_id || datasetId)
      setActiveFileName(data.filename || `dataset_${datasetId}.csv`)
      setPipelineLogs(data.execution_logs || [])
      setDatasetResult(data.dataset_summary)
      setEdaResult(data.eda_result)
      setMlResult(data.ml_result)
      setSuggestedQuestions(data.suggested_questions || null)

      const combinedInsights = {
        ...(data.insight_result || {}),
        charts: data.visualization_result?.charts || [],
      }
      setInsightsResult(combinedInsights)
      setActiveTab('quality')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while loading historical dataset.'
      )
    } finally {
      setHistoryLoadingId(null)
    }
  }

  const handleReset = () => {
    setDatasetResult(null)
    setEdaResult(null)
    setMlResult(null)
    setInsightsResult(null)
    setSuggestedQuestions(null)
    setPipelineLogs(undefined)
    setCurrentRunId(undefined)
    setCurrentDatasetId(null)
    setHistoryLoadingId(null)
    setEdaLoading(false)
    setError(null)
    setActiveFileName('')
    setActiveTab('upload')
  }

  const hasData = datasetResult !== null

  // ── Landing Page ──────────────────────────────────────────────────────────
  if (currentView === 'landing') {
    return (
      <LandingPage
        onLaunch={() => setCurrentView('dashboard')}
        backendOnline={backendOnline}
        hasData={hasData}
        activeFileName={activeFileName}
      />
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      hasData={hasData}
      onLanding={() => setCurrentView('landing')}
      onReset={handleReset}
      backendOnline={backendOnline}
      activeFileName={activeFileName}
      datasetResult={datasetResult}
      pipelineLogs={pipelineLogs}
      isProcessing={uploading}
      error={error}
      onDismissError={() => setError(null)}
    >
      <CenterCanvas activeTab={activeTab}>
        {/* ── TAB 1: UPLOAD ─────────────────────────────────────────── */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Section heading */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Import Dataset
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Drop a CSV file to start the multi-agent pipeline — cleaning, EDA, ML, and insights are generated automatically.
              </p>
            </div>

            <UploadSection
              onFileUpload={handleUploadFile}
              disabled={uploading}
              activeFileName={activeFileName}
              onReset={handleReset}
              isExecutingPipeline={uploading}
              pipelineLogs={pipelineLogs}
              runId={currentRunId}
              backendUrl={BACKEND_URL}
            />

            {hasData && (
              <div
                style={{
                  marginTop: 20,
                  padding: '20px 24px',
                  borderRadius: 14,
                  background: 'var(--bg-surface1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Dataset "{activeFileName}" processed — where would you like to go?
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {([
                    { tab: 'quality' as ActiveTab,   label: 'Data Quality & Schema',  color: '#6366f1' },
                    { tab: 'eda' as ActiveTab,        label: 'Exploratory Analysis',    color: '#06b6d4' },
                    { tab: 'sql' as ActiveTab,        label: 'Ask a Question',          color: '#10b981' },
                    { tab: 'ml' as ActiveTab,         label: 'ML Insights',             color: '#a78bfa' },
                    { tab: 'insights' as ActiveTab,   label: 'Business Summary',        color: '#f59e0b' },
                  ] as const).map(({ tab, label, color }) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        background: `${color}18`,
                        border: `1px solid ${color}40`,
                        color,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        transition: 'background 0.15s, transform 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}28` }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}18` }}
                    >
                      <>
                        {label}
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: DATA QUALITY ───────────────────────────────────── */}
        {activeTab === 'quality' && datasetResult && (
          <DataQualityView
            summary={datasetResult.summary}
            shape={datasetResult.shape}
            fileName={activeFileName}
            columns={datasetResult.columns}
            cleanedPreview={datasetResult.cleaned_preview}
            report={datasetResult.data_quality_report}
            onReset={handleReset}
            onProceed={() => setActiveTab('eda')}
          />
        )}

        {/* ── TAB 3: EDA ────────────────────────────────────────────── */}
        {activeTab === 'eda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Exploratory Analysis
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Statistical distributions and temporal trends, computed on the validated subset.
                </p>
              </div>
              <span
                style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                  color: '#a5b4fc', flexShrink: 0,
                }}
              >
                EDA Agent
              </span>
            </div>

            {edaLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px', background: 'var(--bg-surface1)', borderRadius: 14, border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid var(--accent-indigo)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Computing statistical metrics…</span>
              </div>
            )}

            {edaResult && !edaLoading && (
              <>
                <NotablePatterns patterns={edaResult.notable_patterns} />
                <EDASummarySection numericSummary={edaResult.numeric_summary} statsComputedOn={edaResult.stats_computed_on} />
                <CategoricalDistributions categoricalSummary={edaResult.categorical_summary} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <CorrelationMatrix correlationMatrix={edaResult.correlation_matrix} />
                  <MonthlyTrendChart monthlyTrend={edaResult.monthly_trend} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setActiveTab('sql')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Proceed to Ask a Question
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 4: SQL / CHAT ─────────────────────────────────────── */}
        {activeTab === 'sql' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Ask a Question
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Natural language → SQL → results. The SQL Agent translates your question and runs it against the cleaned dataset.
              </p>
            </div>
            <AskQuestionView
              backendUrl={BACKEND_URL}
              disabled={!hasData}
              suggestedQuestions={suggestedQuestions as any}
              currentDatasetId={currentDatasetId}
            />
          </div>
        )}

        {/* ── TAB 5: ML INSIGHTS ────────────────────────────────────── */}
        {activeTab === 'ml' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  ML Insights
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Anomaly detection and honest forecasting generated by the ML Agent.
                </p>
              </div>
              <span
                style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                  background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
                  color: '#a78bfa', flexShrink: 0,
                }}
              >
                ML Agent
              </span>
            </div>
            <MLInsightsView backendUrl={BACKEND_URL} disabled={!hasData} hasData={hasData} initialData={mlResult} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setActiveTab('insights')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Proceed to Business Summary
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 6: BUSINESS SUMMARY ───────────────────────────────── */}
        {activeTab === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Business Summary
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Executive intelligence brief synthesised by the Insight Agent.
                </p>
              </div>
              <span
                style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                  color: '#f59e0b', flexShrink: 0,
                }}
              >
                Insight Agent
              </span>
            </div>
            <BusinessSummaryView
              backendUrl={BACKEND_URL}
              disabled={!hasData}
              hasData={hasData}
              initialData={insightsResult}
              dataHealthScore={datasetResult?.data_health_score || datasetResult?.data_quality_report?.data_health_score}
            />
          </div>
        )}

        {/* ── TAB 7: UPLOAD HISTORY ─────────────────────────────────── */}
        {activeTab === 'history' && (
          <HistoryView
            backendUrl={BACKEND_URL}
            onLoadDataset={handleLoadHistoricalDataset}
            activeDatasetId={currentDatasetId}
            loadingDatasetId={historyLoadingId}
          />
        )}

        {/* ── Empty / No data state for locked tabs ─────────────────── */}
        {!hasData && activeTab !== 'upload' && activeTab !== 'history' && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ margin: '0 auto', opacity: 0.4 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>No dataset loaded</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280 }}>
              Upload a CSV on the Upload tab or select a run from the History tab to unlock this view.
            </div>
            <button className="btn-primary" onClick={() => setActiveTab('upload')}>
              Go to Upload
            </button>
          </div>
        )}
      </CenterCanvas>
    </DashboardLayout>
  )
}

export default App
