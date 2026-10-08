import { useState } from 'react'

interface Props { backendUrl?: string; disabled?: boolean; onFileUpload: (file: File) => void }
export function DatabaseImport({ backendUrl = '', disabled = false, onFileUpload }: Props) {
  const [tables, setTables] = useState<string[]>([])
  const [table, setTable] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const loadTables = async () => {
    setBusy(true); setMessage('')
    try {
      const response = await fetch(`${backendUrl}/api/database/tables`)
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail || 'Cannot load database tables.')
      setTables(body.tables || []); setTable(body.tables?.[0] || '')
      if (!body.configured) setMessage('Set ANALYTICS_DATABASE_URL in backend/.env to connect your database, then restart the backend.')
      else if (!body.tables?.length) setMessage('No tables found in the configured database.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Connection failed.') }
    finally { setBusy(false) }
  }
  const importTable = async () => {
    setBusy(true); setMessage('')
    try {
      const response = await fetch(`${backendUrl}/api/database/extract`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table }),
      })
      if (!response.ok) { const body = await response.json(); throw new Error(body.detail || 'Import failed.') }
      onFileUpload(new File([await response.blob()], `${table.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`, { type: 'text/csv' }))
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Import failed.') }
    finally { setBusy(false) }
  }
  return <details style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
    <summary style={{ cursor: 'pointer', padding: '8px 0' }}>Import from a database</summary>
    <p>Import a table from your configured PostgreSQL, MySQL or SQLite source.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
      <button type="button" className="btn-ghost" disabled={disabled || busy} onClick={loadTables}>{busy ? 'Loading…' : 'Load tables'}</button>
      {tables.length > 0 && <>
        <select aria-label="Source table" value={table} disabled={disabled || busy} onChange={e => setTable(e.target.value)} className="btn-ghost">
          {tables.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <button type="button" className="btn-ghost" disabled={disabled || busy || !table} onClick={importTable}>Analyze table</button>
      </>}
    </div>
    {message && <p role="status" style={{ overflowWrap: 'anywhere' }}>{message}</p>}
  </details>
}
