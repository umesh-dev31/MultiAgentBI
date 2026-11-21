import { useState } from 'react'
import type { ColumnInfo } from '../../types/data'
import { MLInsightsView } from './MLInsightsView'
import { ModelBuilder } from './ModelBuilder'

type Props = {
  backendUrl: string
  hasData: boolean
  visible: boolean
  initialData: unknown
  currentDatasetId: number | null
  columns: ColumnInfo[]
}

export function MLWorkspace({ backendUrl, hasData, visible, initialData, currentDatasetId, columns }: Props) {
  const [view, setView] = useState<'insights' | 'builder'>('insights')

  return (
    <>
      {hasData && currentDatasetId != null && (
        <div className="model-view-switch" role="group" aria-label="Machine learning view">
          <button type="button" aria-pressed={view === 'insights'} onClick={() => setView('insights')}>Automatic insights</button>
          <button type="button" aria-pressed={view === 'builder'} onClick={() => setView('builder')}>Build a model</button>
        </div>
      )}
      <div hidden={view !== 'insights'}>
        <MLInsightsView backendUrl={backendUrl} disabled={!hasData} hasData={hasData} initialData={initialData} currentDatasetId={currentDatasetId} />
      </div>
      {hasData && currentDatasetId != null && (
        <div hidden={view !== 'builder'}>
          <ModelBuilder datasetId={currentDatasetId} columns={columns} visible={visible && view === 'builder'} />
        </div>
      )}
    </>
  )
}
