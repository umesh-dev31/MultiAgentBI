import { useEffect, useRef, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { requestJson } from '../../api'
import type { ColumnInfo } from '../../types/data'
import './ModelBuilder.css'

type Task = 'auto' | 'regression' | 'classification'
type Inspection = {
  eligible: boolean
  workspace_eligible: boolean
  reasons: string[]
  workspace_reasons: string[]
  warnings: string[]
  task: Task
  rows: number
  algorithms: { id: string; label: string; description: string }[]
  recommended_algorithm: string | null
  recommendation_reason: string
}
type Report = {
  task: Task
  algorithm: string
  metrics: Record<string, number>
  baseline: Record<string, number>
  train_rows: number
  test_rows: number
  feature_importance?: { feature: string; importance: number }[]
  predictions?: { actual: number; predicted: number }[]
  classes?: string[]
  confusion_matrix?: number[][]
}
type JobStatus = { state: string; model_report?: Report; error?: { message: string } }
const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 3 })
const metricLabels: Record<string, string> = {
  mae: 'Mean absolute error',
  rmse: 'Root mean squared error',
  r2: 'R²',
  accuracy: 'Accuracy',
  balanced_accuracy: 'Balanced accuracy',
  f1_macro: 'Macro F1',
  macro_f1: 'Macro F1',
}

function ModelReport({ report, algorithm }: { report: Report; algorithm: string }) {
  const isRegression = report.task === 'regression'
  return (
    <section className="model-card" aria-labelledby="model-report-title">
      <h3 id="model-report-title">Model evaluation</h3>
      <p>{algorithm} · {format(report.train_rows)} training rows · {format(report.test_rows)} held-out test rows</p>
      <p>{isRegression
        ? 'The baseline predicts the median outcome from training. Lower error and higher R² are better.'
        : 'The baseline predicts the most common category from training. Higher scores are better.'}</p>
      <div className="model-table-wrap">
        <table>
          <thead><tr><th scope="col">Metric</th><th scope="col">Model</th><th scope="col">Baseline</th></tr></thead>
          <tbody>
            {Object.entries(report.metrics).map(([name, value]) => (
              <tr key={name}>
                <th scope="row">{metricLabels[name] ?? name.replaceAll('_', ' ')}</th>
                <td>{format(value)}</td>
                <td>{report.baseline[name] == null ? '—' : format(report.baseline[name])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!!report.predictions?.length && (
        <div className="model-chart">
          <h4>Actual vs. predicted</h4>
          <p>Each point is a sampled test row. The chart shows up to 300 rows from the held-out test set.</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 5 }}>
              <CartesianGrid stroke="var(--border-subtle)" />
              <XAxis type="number" dataKey="actual" name="Actual" domain={['auto', 'auto']} label={{ value: 'Actual', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)' }} />
              <YAxis type="number" dataKey="predicted" name="Predicted" domain={['auto', 'auto']} label={{ value: 'Predicted', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'var(--bg-root)', borderColor: 'var(--border-medium)' }} />
              <Scatter data={report.predictions} fill="var(--color-success)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
      {report.classes && report.confusion_matrix && (
        <div>
          <h4>Confusion matrix</h4>
          <p>Rows are actual categories. Columns are predicted categories.</p>
          <div className="model-table-wrap">
            <table>
              <thead><tr><th scope="col">Actual / Predicted</th>{report.classes.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>
                {report.confusion_matrix.map((row, index) => (
                  <tr key={index}>
                    <th scope="row">{report.classes?.[index]}</th>
                    {row.map((count, column) => <td key={column} className={column === index ? 'model-matrix-match' : undefined}>{count}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!!report.feature_importance?.length && (
        <div>
          <h4>Feature importance</h4>
          <p>Estimated change in test performance when an input is shuffled. Higher values indicate greater predictive contribution.</p>
          <div className="model-table-wrap">
            <table>
              <thead><tr><th scope="col">Input</th><th scope="col">Importance</th></tr></thead>
              <tbody>
                {report.feature_importance.map(({ feature, importance }) => (
                  <tr key={feature}><th scope="row">{feature}</th><td>{format(importance)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

export function ModelBuilder({ datasetId, columns, visible }: { datasetId: number; columns: ColumnInfo[]; visible: boolean }) {
  const [target, setTarget] = useState('')
  const [features, setFeatures] = useState<string[]>([])
  const [task, setTask] = useState<Task>('auto')
  const [algorithm, setAlgorithm] = useState('')
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [busy, setBusy] = useState<'check' | 'train' | 'export' | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const activeRequest = useRef<AbortController | null>(null)
  useEffect(() => () => activeRequest.current?.abort(), [])
  const endpoint = '/api/datasets/' + datasetId + '/model/'
  const selectedAlgorithm = inspection?.algorithms.find(item => item.id === algorithm)

  function resetReview() {
    setInspection(null)
    setAlgorithm('')
    setReport(null)
    setError('')
    setStatus('')
  }

  async function run(action: 'check' | 'train' | 'export') {
    if (activeRequest.current || !target || !features.length) return
    if (action !== 'check' && !algorithm) return
    const controller = new AbortController()
    activeRequest.current = controller
    setBusy(action)
    setError('')
    setStatus('')
    if (action !== 'export') setReport(null)
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, features, task, ...(action !== 'check' && { algorithm }) }),
      signal: controller.signal,
    }
    try {
      if (action === 'check') {
        const result = await requestJson<Inspection>(endpoint + 'inspect', options)
        setInspection(result)
        setAlgorithm(result.recommended_algorithm ?? result.algorithms[0]?.id ?? '')
      } else if (action === 'export') {
        const response = await fetch(endpoint + 'export', options)
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          const detail = body?.error?.message ?? body?.detail
          throw new Error(typeof detail === 'string' ? detail : 'Could not prepare the Colab download.')
        }
        const url = URL.createObjectURL(await response.blob())
        const link = document.createElement('a')
        link.href = url
        link.download = 'agentinsight-colab.zip'
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        setStatus('Open the notebook in Google Colab, choose Run all, and upload the dataset from the ZIP when prompted.')
      } else {
        setStatus('Submitting your training job…')
        const job = await requestJson<{ status_url: string }>(endpoint + 'train', options)
        for (;;) {
          await new Promise(resolve => window.setTimeout(resolve, 750))
          if (controller.signal.aborted) return
          const result = await requestJson<JobStatus>(job.status_url, { signal: controller.signal })
          if (result.state === 'failed') throw new Error(result.error?.message ?? 'Training did not finish.')
          if (result.state === 'completed' || result.state === 'completed_with_warnings') {
            if (!result.model_report) throw new Error('Training finished without an evaluation report.')
            setReport(result.model_report)
            setStatus('Training complete.')
            break
          }
          setStatus(result.state === 'running' ? 'Training and evaluating your model…' : 'Waiting for the workspace worker…')
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setStatus('')
        setError(err instanceof Error ? err.message : 'Could not complete the request.')
      }
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null
      if (!controller.signal.aborted) setBusy(null)
    }
  }

  if (!columns.length) return <p className="model-card" role="status">This dataset has no available columns to model.</p>

  return (
    <div className="model-builder">
      <section className="model-card" aria-labelledby="model-builder-title">
        <h3 id="model-builder-title">Build a predictive model</h3>
        <p>Choose the outcome you want to predict and the inputs that will be available when you make a prediction.</p>
        <form onSubmit={event => { event.preventDefault(); void run('check') }}>
          <fieldset disabled={!!busy}>
            <div className="model-grid">
              <label>Outcome column
                <select required value={target} onChange={event => {
                  setTarget(event.target.value)
                  setFeatures(features.filter(name => name !== event.target.value))
                  resetReview()
                }}>
                  <option value="">Choose an outcome</option>
                  {columns.map(({ name }) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label>Prediction type
                <select value={task} onChange={event => { setTask(event.target.value as Task); resetReview() }}>
                  <option value="auto">Recommend a prediction type</option>
                  <option value="regression">Predict a number (regression)</option>
                  <option value="classification">Predict a category (classification)</option>
                </select>
              </label>
            </div>
            <fieldset className="model-features">
              <legend>Input columns <span>({features.length} selected)</span></legend>
              <div className="model-feature-list">
                {columns.filter(({ name }) => name !== target).map(({ name, dtype }) => (
                  <label key={name}>
                    <input type="checkbox" checked={features.includes(name)} onChange={event => {
                      setFeatures(event.target.checked ? [...features, name] : features.filter(feature => feature !== name))
                      resetReview()
                    }} />
                    {name}{dtype && <small>{dtype}</small>}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="btn-primary" disabled={!target || !features.length || !!busy}>
              {busy === 'check' ? 'Checking…' : 'Check eligibility'}
            </button>
          </fieldset>
        </form>
      </section>

      {inspection && (
        <section className="model-card" aria-labelledby="model-eligibility-title">
          <h3 id="model-eligibility-title">{inspection.eligible ? 'Training options' : 'This selection needs changes'}</h3>
          <p>{format(inspection.rows)} usable outcome rows{inspection.task !== 'auto' ? ' · ' + inspection.task : ''}</p>
          {!!inspection.reasons.length && <ul>{inspection.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
          {!!inspection.warnings.length && <ul className="model-warning">{inspection.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
          {inspection.eligible && (
            <>
              <label>Algorithm
                <select value={algorithm} disabled={!!busy} onChange={event => { setAlgorithm(event.target.value); setReport(null); setStatus(''); setError('') }}>
                  {inspection.algorithms.map(item => (
                    <option key={item.id} value={item.id}>{item.label}{item.id === inspection.recommended_algorithm ? ' (recommended)' : ''}</option>
                  ))}
                </select>
              </label>
              {inspection.recommendation_reason && <p>{inspection.recommendation_reason} Use the test results to judge how well the model fits.</p>}
              {selectedAlgorithm?.description && <p>{selectedAlgorithm.description}</p>}
              <div className="model-grid">
                <div className="model-option">
                  <h4>Train in workspace</h4>
                  <p>Run a small background job and see the evaluation here.</p>
                  {!!inspection.workspace_reasons.length && <ul>{inspection.workspace_reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
                  <button type="button" className="btn-primary" disabled={!!busy || !algorithm || !inspection.workspace_eligible} onClick={() => void run('train')}>
                    {busy === 'train' ? 'Training…' : 'Train in workspace'}
                  </button>
                </div>
                <div className="model-option">
                  <h4>Train in Google Colab</h4>
                  <p>Download a ZIP with the ready-to-run notebook and the selected columns from your dataset.</p>
                  <button type="button" className="btn-primary" disabled={!!busy || !algorithm} onClick={() => void run('export')}>
                    {busy === 'export' ? 'Preparing download…' : 'Download Colab bundle'}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
      {error && <p className="model-error model-card" role="alert">{error}</p>}
      {status && <p className="model-card" role="status">{status}</p>}
      {visible && report && <ModelReport report={report} algorithm={selectedAlgorithm?.label ?? report.algorithm} />}
    </div>
  )
}
