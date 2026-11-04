import React from 'react'

const number = value => value == null ? 'Not evaluable' : new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value)
const labels = {
  sensitive: 'Sensitive to cleaning choices',
  stable_in_tested_scenarios: 'Stable in tested scenarios',
  not_applicable: 'No missing metric values to compare',
  insufficient: 'Insufficient comparison evidence',
  not_assessable: 'Not assessed',
}

export const CleaningSensitivity = ({ report }) => {
  if (!report) return <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Upload a dataset again to run the new cleaning-sensitivity comparison.</p>
  const scenarios = report.scenarios || []
  const sensitive = report.status === 'sensitive'
  const accent = sensitive ? '#d97706' : 'var(--text-secondary)'
  const names = Object.fromEntries(scenarios.map(s => [s.id, s.name]))
  return <section aria-label="Cleaning sensitivity analysis" style={{ padding: 22, borderRadius: 16, border: `1px solid ${sensitive ? 'rgba(217,119,6,.4)' : 'var(--border-medium)'}`, background: 'var(--bg-surface1)', color: 'var(--text-primary)' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 5px' }}>Does the conclusion depend on cleaning?</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Compare missing-value policies before acting on the selected business metric.</p>
      </div>
      <span style={{ color: accent, fontSize: 12, fontWeight: 700 }}>{labels[report.status] || 'Not assessed'}</span>
    </div>
    <p style={{ fontSize: 13, lineHeight: 1.6, margin: '16px 0', color: accent }}>{report.message}</p>
    {scenarios.length > 0 && <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', fontSize: 12, marginBottom: 16 }}>
        <span><strong>Metric:</strong> {report.metric}</span>
        <span><strong>Affected rows:</strong> {report.affected_rows}</span>
        {report.agreement && <span><strong>Leading-category agreement:</strong> {report.agreement.agreeing} / {report.agreement.tested} distinct scenarios</span>}
        {report.metric_range && <span><strong>Tested total range:</strong> {number(report.metric_range.min)} to {number(report.metric_range.max)}</span>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table aria-label="Cleaning scenario comparison" style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12, textAlign: 'left' }}>
          <thead><tr>{['Scenario', 'Rows used', `Total (${report.metric})`, report.group_column ? `Leading ${report.group_column}` : 'Category ranking', 'Evidence'].map(h => <th key={h} style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-medium)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
          <tbody>{scenarios.map(s => <tr key={s.id}>
            <td style={cell}>{s.name}</td><td style={cell}>{s.rows_used}</td><td style={cell}>{number(s.total)}</td>
            <td style={cell}>{s.leaders?.length > 1 ? 'Tie: ' : ''}{s.leaders?.join(' / ') || 'Not available'}</td>
            <td style={cell}>{s.equivalent_to ? `Same data as ${names[s.equivalent_to] || s.equivalent_to}; not counted twice` : s.total == null ? 'Excluded from agreement' : 'Distinct scenario'}{s.notes?.map(note => <div key={note} style={{ color: 'var(--text-muted)', marginTop: 4 }}>{note}</div>)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 12 }}>Material total variation threshold: {report.variation_threshold_pct}% of the current total. Agreement is over tested scenarios, not statistical confidence or model accuracy.</p>
    </>}
    {report.review_rows?.length > 0 && <details style={{ marginTop: 15, fontSize: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Source rows to verify ({report.review_rows.length} shown)</summary>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{report.review_note}</p>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>{report.review_rows.map(row => <li key={row.row_index}>File row <strong>{row.row_index}</strong>: missing {row.columns.join(', ')}{row.category ? ` (${row.category})` : ''}; tested contribution range {number(row.metric_contribution_range)}.</li>)}</ul>
    </details>}
    <details style={{ marginTop: 15, fontSize: 12, color: 'var(--text-muted)' }}>
      <summary style={{ cursor: 'pointer' }}>Method and limitations</summary>
      <p style={{ lineHeight: 1.6 }}>{report.scope}</p>
      <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>{(report.limitations || []).map(item => <li key={item}>{item}</li>)}</ul>
      {report.duration_ms != null && <p>Deterministic comparison time: {report.duration_ms} ms. No additional LLM calls.</p>}
    </details>
  </section>
}
const cell = { padding: '12px 8px', borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'top' }
