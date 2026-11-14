import { useEffect, useRef, useState } from 'react'
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
import { ApiError, requestJson } from './api'
import type { EDAResponse, JobStatus, PipelineRunResponse } from './types/data'

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
  const [exporting, setExporting] = useState(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const [edaLoading, setEdaLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<PipelineRunResponse | null>(null)
  const [job, setJob] = useState<JobStatus | null>(null)
  const [uploadFileName, setUploadFileName] = useState('')
  const [historyLoadingId, setHistoryLoadingId] = useState<number | null>(null)
  const operation = useRef<AbortController | null>(null)

  const currentDatasetId = analysis?.dataset_id ?? null
  const activeFileName = analysis?.filename ?? ''
  const datasetResult = analysis?.dataset_summary ?? null
  const edaResult = analysis?.eda_result ?? null
  const pipelineLogs = analysis?.execution_logs
  const insightsResult = analysis && (analysis.insight_result || analysis.visualization_result)
    ? { ...analysis.insight_result, charts: analysis.visualization_result?.charts ?? [] }
    : null

  useEffect(() => () => operation.current?.abort(), [])

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
    if (operation.current) return
    const controller = new AbortController()
    operation.current = controller
    const { signal } = controller
    setError(null)
    setUploading(true)
    setUploadFileName(file.name)
    setJob(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const submitted = await requestJson<{ job_id: string }>(BACKEND_URL + '/api/jobs', {
        method: 'POST',
        body: formData,
        signal,
      })
      const statusUrl = BACKEND_URL + '/api/jobs/' + encodeURIComponent(submitted.job_id)
      let attempts = 0
      while (!signal.aborted) {
        let status: JobStatus
        try {
          status = await requestJson<JobStatus>(statusUrl, { signal })
          attempts = 0
        } catch (error) {
          if (signal.aborted) return
          if (error instanceof ApiError && error.status < 500) throw error
          attempts += 1
          if (attempts >= 4) {
            throw new Error('Could not check this upload. Open History to find the report when processing finishes.')
          }
          await new Promise(resolve => setTimeout(resolve, 1500))
          continue
        }
        if (signal.aborted) return
        setJob(status)
        if (status.state === 'failed') {
          throw new Error(status.error?.message ?? 'Dataset processing failed.')
        }
        if (status.state === 'completed' || status.state === 'completed_with_warnings') {
          if (!status.result) throw new Error('The job finished without a report. Check History.')
          setAnalysis(status.result)
          setBackendOnline(true)
          setActiveTab('quality')
          return
        }
        await new Promise(resolve => setTimeout(resolve, 800))
      }
    } catch (err) {
      if (!signal.aborted) {
        setError(err instanceof Error ? err.message : 'Dataset processing failed.')
      }
    } finally {
      if (operation.current === controller) {
        operation.current = null
        setUploading(false)
      }
    }
  }

  const handleLoadHistoricalDataset = async (datasetId: number) => {
    if (operation.current) return
    const controller = new AbortController()
    operation.current = controller
    setError(null)
    setHistoryLoadingId(datasetId)
    try {
      const data = await requestJson<PipelineRunResponse>(BACKEND_URL + '/api/history/' + datasetId, {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setAnalysis({ ...data, dataset_id: data.dataset_id ?? datasetId })
      setJob(null)
      setBackendOnline(true)
      setActiveTab('quality')
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Could not load the saved report.')
      }
    } finally {
      if (operation.current === controller) {
        operation.current = null
        setHistoryLoadingId(null)
      }
    }
  }

  const handleComputeEda = async () => {
    if (currentDatasetId == null || operation.current) return
    const controller = new AbortController()
    operation.current = controller
    setEdaLoading(true)
    setError(null)
    try {
      const result = await requestJson<EDAResponse>(BACKEND_URL + '/api/datasets/' + currentDatasetId + '/analysis/eda', {
        method: 'POST',
        signal: controller.signal,
      })
      if (!controller.signal.aborted) {
        setAnalysis(previous => previous ? { ...previous, eda_result: result } : null)
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not calculate analysis.')
    } finally {
      if (operation.current === controller) {
        operation.current = null
        setEdaLoading(false)
      }
    }
  }

  const handleExport = async (format: 'csv' | 'json' | 'html') => {
    if (!currentDatasetId) {
      setError('This dataset was not saved. Please upload it again before exporting.')
      return
    }
    setExporting(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/export/${currentDatasetId}?format=${format}`)
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.detail || 'Export failed. Please try again.')
      }
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `agentinsight-${currentDatasetId}.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    } finally { setExporting(false) }
  }

  const handleReset = () => {
    operation.current?.abort()
    operation.current = null
    setAnalysis(null)
    setJob(null)
    setUploadFileName('')
    setUploading(false)
    setHistoryLoadingId(null)
    setEdaLoading(false)
    setError(null)
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
      onExport={handleExport}
      exporting={exporting}
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
                Upload a CSV or Excel file to review its quality and explore the results.
              </p>
            </div>

            <UploadSection
              onFileUpload={handleUploadFile}
              disabled={uploading || historyLoadingId != null || edaLoading}
              activeFileName={uploading || job ? uploadFileName : activeFileName}
              onReset={handleReset}
              isExecutingPipeline={uploading}
              job={job}
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

        {analysis?.warnings && analysis.warnings.length > 0 && activeTab === 'quality' && (
          <aside className="mb-4 rounded-lg border border-amber-500/40 p-4" role="status">
            <h3 className="text-sm font-semibold">Analysis notes</h3>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {analysis.warnings.map(warning => (
                <li key={warning.stage + warning.code}>{warning.message}</li>
              ))}
            </ul>
          </aside>
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

            {hasData && !edaResult && !edaLoading && (
              <button className="btn-primary self-start" disabled={currentDatasetId == null} onClick={handleComputeEda}>
                Calculate exploratory analysis
              </button>
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
              key={currentDatasetId}
              backendUrl={BACKEND_URL}
              disabled={!hasData}
              suggestedQuestions={analysis?.suggested_questions}
              currentDatasetId={currentDatasetId}
              qualityReport={datasetResult?.data_quality_report}
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
            <MLInsightsView key={currentDatasetId} backendUrl={BACKEND_URL} disabled={!hasData} hasData={hasData} initialData={analysis?.ml_result} currentDatasetId={currentDatasetId} />
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
              key={currentDatasetId}
              currentDatasetId={currentDatasetId}
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
