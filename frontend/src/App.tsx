import { useEffect, useState } from 'react'
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
import type { EDAResponse, UploadResponse } from './types/data'

const BACKEND_URL = 'http://localhost:8000'

type ActiveTab = 'upload' | 'quality' | 'eda' | 'sql' | 'ml'

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload')
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [edaLoading, setEdaLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState<string>('')
  const [datasetResult, setDatasetResult] = useState<UploadResponse | null>(null)
  const [edaResult, setEdaResult] = useState<EDAResponse | null>(null)

  // Verify backend health on mount
  const checkHealth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`)
      if (res.ok) {
        setBackendOnline(true)
      } else {
        setBackendOnline(false)
      }
    } catch {
      setBackendOnline(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const handleUploadFile = async (file: File) => {
    setError(null)
    setUploading(true)
    setActiveFileName(file.name)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = `Upload failed with HTTP ${response.status}`
        try {
          const errJson = await response.json()
          if (errJson && errJson.detail) {
            errorMessage = errJson.detail
          }
        } catch {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data: UploadResponse = await response.json()
      setDatasetResult(data)
      // Advance to Data Quality & Preview tab automatically
      setActiveTab('quality')

      // Fetch Exploratory Data Analysis from EDA Agent
      try {
        setEdaLoading(true)
        const edaResponse = await fetch(`${BACKEND_URL}/api/eda`, {
          method: 'POST',
        })
        if (edaResponse.ok) {
          const edaData: EDAResponse = await edaResponse.json()
          setEdaResult(edaData)
        }
      } catch (edaErr) {
        console.warn('Exploratory analysis fetch error:', edaErr)
      } finally {
        setEdaLoading(false)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while processing the dataset.'
      )
      setDatasetResult(null)
      setEdaResult(null)
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    setDatasetResult(null)
    setEdaResult(null)
    setEdaLoading(false)
    setError(null)
    setActiveFileName('')
    setActiveTab('upload')
  }

  const hasData = datasetResult !== null

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  AgentInsight AI
                </h1>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  v0.2
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Autonomous Multi-Agent Business Intelligence & Analytics
              </p>
            </div>
          </div>

          {/* Backend Status & File Badge */}
          <div className="flex items-center gap-2.5">
            {activeFileName && (
              <span className="text-xs font-mono font-semibold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                📁 {activeFileName}
              </span>
            )}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 shadow-2xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendOnline === true
                    ? 'bg-emerald-500'
                    : backendOnline === false
                    ? 'bg-rose-500'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-slate-700">
                {backendOnline === true
                  ? 'API Online'
                  : backendOnline === false
                  ? 'API Offline'
                  : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Step / Tab Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2">
            {/* Tab 1: Upload */}
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border border-current">
                1
              </span>
              <span>Upload Dataset</span>
            </button>

            {/* Tab 2: Data Quality */}
            <button
              onClick={() => hasData && setActiveTab('quality')}
              disabled={!hasData}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'quality'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : hasData
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border border-current">
                2
              </span>
              <span>Data Quality & Schema</span>
              {hasData && datasetResult.data_quality_report && (
                <span
                  className={`ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeTab === 'quality'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {datasetResult.data_quality_report.flagged_for_review.length} flagged
                </span>
              )}
            </button>

            {/* Tab 3: Exploratory Analysis */}
            <button
              onClick={() => hasData && setActiveTab('eda')}
              disabled={!hasData}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'eda'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : hasData
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border border-current">
                3
              </span>
              <span>Exploratory Analysis (EDA)</span>
              {edaLoading && (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin ml-1" />
              )}
            </button>

            {/* Tab 4: Ask a Question */}
            <button
              onClick={() => hasData && setActiveTab('sql')}
              disabled={!hasData}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'sql'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : hasData
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border border-current">
                4
              </span>
              <span>Ask a Question</span>
            </button>

            {/* Tab 5: ML Insights */}
            <button
              onClick={() => hasData && setActiveTab('ml')}
              disabled={!hasData}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'ml'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : hasData
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border border-current">
                5
              </span>
              <span>ML Insights</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grow space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between shadow-xs">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <h4 className="font-bold text-sm">Processing Alert</h4>
                <p className="text-xs mt-0.5 font-medium">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: UPLOAD VIEW */}
        {activeTab === 'upload' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <UploadSection
              onFileUpload={handleUploadFile}
              disabled={uploading}
              activeFileName={activeFileName}
              onReset={handleReset}
            />

            {hasData && (
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-3">
                <h4 className="text-sm font-bold text-slate-900">
                  Dataset "{activeFileName}" is loaded and ready
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Cleaning, audit report, and exploratory analysis have been generated. Proceed to inspect data quality or view statistical distributions.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('quality')}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer shadow-xs"
                  >
                    View Data Quality & Schema →
                  </button>
                  <button
                    onClick={() => setActiveTab('eda')}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
                  >
                    View Exploratory Analysis →
                  </button>
                  <button
                    onClick={() => setActiveTab('sql')}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                  >
                    Ask a Question (SQL Agent) →
                  </button>
                  <button
                    onClick={() => setActiveTab('ml')}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition cursor-pointer shadow-xs"
                  >
                    Explore ML Insights →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DATA QUALITY & PREVIEW VIEW */}
        {activeTab === 'quality' && datasetResult && (
          <div className="space-y-6">
            {/* KPI Summary Header */}
            <DatasetSummary
              summary={datasetResult.summary}
              shape={datasetResult.shape}
              fileName={activeFileName}
              onReset={handleReset}
            />

            {/* Data Quality Report (Safe Auto-Fixes + Flagged Review) */}
            {datasetResult.data_quality_report && (
              <DataQualityReport report={datasetResult.data_quality_report} />
            )}

            {/* Schema Table & Cleaned Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 flex">
                <SchemaMissingValueTable columns={datasetResult.columns} />
              </div>
              <div className="lg:col-span-7 flex">
                <CleanedDataPreview
                  records={datasetResult.cleaned_preview}
                  columns={datasetResult.columns}
                  totalCleanedRows={datasetResult.summary.cleaned_rows}
                />
              </div>
            </div>

            {/* Bottom Next Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveTab('eda')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer"
              >
                <span>Proceed to Exploratory Analysis</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: EXPLORATORY ANALYSIS (EDA) VIEW */}
        {activeTab === 'eda' && (
          <div className="space-y-6">
            {/* EDA Loading Spinner */}
            {edaLoading && (
              <div className="w-full p-12 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-600 gap-3 shadow-sm">
                <div className="w-9 h-9 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
                <span className="text-sm font-semibold text-slate-800">
                  Computing Exploratory Data Analysis & Statistical Metrics...
                </span>
              </div>
            )}

            {edaResult && !edaLoading && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>Exploratory Data Analysis</span>
                      <span className="text-xs font-normal text-slate-500">
                        (Statistical Distributions & Temporal Trends)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      Evaluated on a validated subset to ensure zero metric contamination from outliers or negatives
                    </p>
                  </div>
                  <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-2xs">
                    EDA Agent Active
                  </span>
                </div>

                {/* 1. Notable Patterns */}
                <NotablePatterns patterns={edaResult.notable_patterns} />

                {/* 2. Numeric Summary Statistics with Validated Subset Banner */}
                <EDASummarySection
                  numericSummary={edaResult.numeric_summary}
                  statsComputedOn={edaResult.stats_computed_on}
                />

                {/* 3. Categorical Top-5 Distributions */}
                <CategoricalDistributions
                  categoricalSummary={edaResult.categorical_summary}
                />

                {/* 4. Pearson Correlation Matrix & Monthly Trend Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-6 flex">
                    <CorrelationMatrix
                      correlationMatrix={edaResult.correlation_matrix}
                    />
                  </div>
                  <div className="lg:col-span-6 flex">
                    <MonthlyTrendChart
                      monthlyTrend={edaResult.monthly_trend}
                    />
                  </div>
                </div>

                {/* Bottom Next Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setActiveTab('sql')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer"
                  >
                    <span>Proceed to Ask a Question</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ASK A QUESTION (SQL AGENT) VIEW */}
        {activeTab === 'sql' && (
          <AskQuestionView
            backendUrl={BACKEND_URL}
            disabled={!hasData}
          />
        )}

        {/* TAB 5: ML INSIGHTS (ML AGENT) VIEW */}
        {activeTab === 'ml' && (
          <MLInsightsView
            backendUrl={BACKEND_URL}
            disabled={!hasData}
            hasData={hasData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-2xs">
        <span className="font-medium text-slate-600">
          AgentInsight AI &bull; Autonomous Multi-Agent BI Platform
        </span>
        <span className="font-mono text-slate-500">
          Modular Frontend Architecture &bull; High-Contrast Modern Theme
        </span>
      </footer>
    </div>
  )
}

export default App
