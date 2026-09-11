import { useEffect, useState } from 'react'
import { LandingPage } from './components/landing/LandingPage'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { CenterCanvas } from './components/dashboard/CenterCanvas'
import { UploadSection } from './components/upload/UploadSection'
import { DatasetSummary } from './components/DatasetSummary'
import { DataQualityReport } from './components/dataQuality/DataQualityReport'
import { SchemaMissingValueTable } from './components/preview/SchemaMissingValueTable'
import { CleanedDataPreview } from './components/preview/CleanedDataPreview'
import { NotablePatterns } from './components/eda/NotablePatterns'
import { EDASummarySection } from './components/eda/EDASummarySection'
import { CategoricalDistributions } from './components/eda/CategoricalDistributions'
import { CorrelationMatrix } from './components/eda/CorrelationMatrix'
import { MonthlyTrendChart } from './components/eda/MonthlyTrendChart'
import { AskQuestionView } from './components/sql/AskQuestionView'
import { MLInsightsView } from './components/ml/MLInsightsView'
import { BusinessSummaryView } from './components/insights/BusinessSummaryView'
import type {
  EDAResponse,
  UploadResponse,
  PipelineExecutionLog,
  PipelineRunResponse,
} from './types/data'

const BACKEND_URL = 'http://localhost:8000'

type ActiveTab = 'upload' | 'quality' | 'eda' | 'sql' | 'ml' | 'insights'
type AppView = 'landing' | 'dashboard'

function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing')
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload')
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
        // Fallback to 127.0.0.1 if localhost IPv6 resolution fails on Windows
        try {
          const fallbackRes = await fetch('http://127.0.0.1:8000/health', { signal: controller.signal })
          ok = fallbackRes.ok
        } catch {
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

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${BACKEND_URL}/api/pipeline/run`, {
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

      // Advance to quality tab
      setActiveTab('quality')
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
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    setDatasetResult(null)
    setEdaResult(null)
    setMlResult(null)
    setInsightsResult(null)
    setSuggestedQuestions(null)
    setPipelineLogs(undefined)
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
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  ✅ Dataset "{activeFileName}" processed — where would you like to go?
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
                      {label} →
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: DATA QUALITY ───────────────────────────────────── */}
        {activeTab === 'quality' && datasetResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Data Quality & Schema
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Automated cleaning audit — what was fixed, what needs your review.
              </p>
            </div>

            <DatasetSummary
              summary={datasetResult.summary}
              shape={datasetResult.shape}
              fileName={activeFileName}
              onReset={handleReset}
            />

            {datasetResult.data_quality_report && (
              <DataQualityReport report={datasetResult.data_quality_report} />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 20 }}>
              <SchemaMissingValueTable columns={datasetResult.columns} />
              <CleanedDataPreview
                records={datasetResult.cleaned_preview}
                columns={datasetResult.columns}
                totalCleanedRows={datasetResult.summary.cleaned_rows}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setActiveTab('eda')}>
                Proceed to Exploration →
              </button>
            </div>
          </div>
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
              <button className="btn-primary" onClick={() => setActiveTab('sql')}>
                Proceed to Ask a Question →
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
              <button className="btn-primary" onClick={() => setActiveTab('insights')}>
                Proceed to Business Summary →
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
            <BusinessSummaryView backendUrl={BACKEND_URL} disabled={!hasData} hasData={hasData} initialData={insightsResult} />
          </div>
        )}

        {/* ── Empty / No data state for locked tabs ─────────────────── */}
        {!hasData && activeTab !== 'upload' && (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>No dataset loaded</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280 }}>
              Upload a CSV on the Upload tab to unlock this view.
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
