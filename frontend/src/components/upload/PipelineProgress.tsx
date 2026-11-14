import type { JobStatus } from '../../types/data'

const stages = [
  ['data_cleaning_node', 'Prepare data'],
  ['validation_node', 'Check data quality'],
  ['eda_node', 'Explore the data'],
  ['ml_node', 'Detect anomalies and project trends'],
  ['visualization_node', 'Suggest charts'],
  ['insight_node', 'Summarize findings'],
  ['knowledge_indexing', 'Index analysis for questions'],
] as const

const jobLabels = {
  queued: 'Queued',
  running: 'Processing',
  completed: 'Completed',
  completed_with_warnings: 'Completed with notes',
  failed: 'Upload failed',
}

const stageLabels = {
  started: 'In progress',
  completed: 'Complete',
  failed: 'Failed',
}

export function PipelineProgress({ job, isExecuting, fileName }: {
  job?: JobStatus | null
  isExecuting: boolean
  fileName?: string
}) {
  const label = job ? jobLabels[job.state] : isExecuting ? 'Submitting upload' : ''
  return (
    <section className="rounded-xl border border-[var(--border-subtle)] p-4">
      <div className="flex flex-wrap justify-between gap-2" role="status">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="min-w-0 break-all text-sm text-[var(--text-muted)]">{fileName}</span>
      </div>
      {job && (
        <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
          {stages.map(([key, name]) => {
            const stage = job.stages[key]
            const terminal = job.state === 'failed' || job.state === 'completed' || job.state === 'completed_with_warnings'
            const status = stage?.status === 'started' && terminal
              ? 'Interrupted'
              : stage ? stageLabels[stage.status] : terminal ? 'Skipped' : 'Pending'
            return (
              <li key={key} className="flex justify-between gap-4 py-2 text-sm">
                <span>{name}</span>
                <span className={stage?.status === 'failed' ? 'text-rose-500' : 'text-[var(--text-muted)]'}>
                  {status}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
