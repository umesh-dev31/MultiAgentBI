import { useState } from 'react';
import { Card, StatusBadge } from './Card';
import type { AnomalyBlock, ChartBlock, InsightBlock, SqlBlock } from '../types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number | string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="ws-chart-tooltip">
      <p className="ws-tip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="ws-tip-row text-zinc-100">
          <span className="text-zinc-400">{p.name}</span>
          <span>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function SqlCard({ block }: { block: SqlBlock }) {
  const [copied, setCopied] = useState(false);
  const preview = block.rows.slice(0, 8);

  async function copy() {
    try {
      await navigator.clipboard.writeText(block.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card
      id={block.id}
      title="SQL query"
      subtitle={`${block.question} · ${block.rowCount} rows`}
      action={
        <button
          type="button"
          onClick={copy}
          className="ws-interactive rounded-lg border border-zinc-800/50 bg-zinc-900 px-2.5 py-1 text-zinc-400 hover:text-zinc-100"
          style={{ fontSize: 12 }}
        >
          {copied ? 'Copied' : 'Copy SQL'}
        </button>
      }
    >
      <pre
        tabIndex={0}
        aria-label="Generated SQL"
        className="overflow-x-auto rounded-lg border border-zinc-800/50 bg-zinc-950 p-3 text-zinc-100"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: '20px' }}
      >
        <code>{block.sql}</code>
      </pre>
      {block.columns.length > 0 ? (
        <div className="overflow-x-auto" style={{ marginTop: 12 }}>
          <table className="w-full border-collapse" style={{ fontSize: 12 }}>
            <caption className="sr-only">Query results</caption>
            <thead>
              <tr>
                {block.columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="border border-zinc-800/50 bg-zinc-900 px-2 py-1.5 text-left text-zinc-400"
                    style={{ fontWeight: 500 }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i}>
                  {block.columns.map((c) => (
                    <td key={c} className="border border-zinc-800/50 px-2 py-1.5 text-zinc-100" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {r[c] === null || r[c] === undefined ? <span className="text-zinc-500">—</span> : String(r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.rowCount > preview.length ? (
            <p className="text-zinc-500" style={{ fontSize: 12, marginTop: 8 }}>
              Showing {preview.length} of {block.rowCount} rows.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-zinc-500" style={{ fontSize: 12, marginTop: 12 }}>
          The query ran but returned no tabular rows.
        </p>
      )}
    </Card>
  );
}

export function ChartCard({ block }: { block: ChartBlock }) {
  const [mode, setMode] = useState<'revenue' | 'orders'>('revenue');
  return (
    <Card
      id={block.id}
      title={block.title}
      subtitle="Monthly trend from the validated subset"
      action={
        <div role="group" aria-label="Chart metric" className="flex gap-1">
          {(['revenue', 'orders'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`ws-interactive rounded-lg border px-2.5 py-1 capitalize ${
                mode === m
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-100'
                  : 'border-zinc-800/50 bg-zinc-900 text-zinc-400 hover:text-zinc-100'
              }`}
              style={{ fontSize: 12 }}
            >
              {m}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ height: 240 }} role="img" aria-label={`${block.title}: ${mode} by month`}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'revenue' ? (
            <LineChart data={block.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} tickLine={false} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} width={64} tickFormatter={(v: number) => v.toLocaleString()} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#f4f4f5" strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <BarChart data={block.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} tickLine={false} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
              <Bar dataKey="orders" name="Orders" fill="#a1a1aa" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function AnomalyCard({ block }: { block: AnomalyBlock }) {
  if (block.items.length === 0) {
    return (
      <Card id={block.id} title={block.title} subtitle="No anomalies met the threshold">
        <p className="text-zinc-400" style={{ fontSize: 14, lineHeight: '20px' }}>
          Isolation Forest found no category-relative outliers in the validated subset.
        </p>
      </Card>
    );
  }
  return (
    <Card
      id={block.id}
      title={block.title}
      subtitle={`${block.items.length} flagged ${block.items.length === 1 ? 'item' : 'items'}`}
      action={<StatusBadge status="warning" label="Needs review" />}
    >
      <ul className="flex flex-col gap-2">
        {block.items.slice(0, 6).map((a, i) => (
          <li key={i} className="rounded-lg border border-zinc-800/50 bg-zinc-950 p-3">
            <p className="text-zinc-100" style={{ fontSize: 14, fontWeight: 500 }}>{a.label}</p>
            <p className="text-zinc-400" style={{ fontSize: 12, marginTop: 4, lineHeight: '16px' }}>{a.detail}</p>
          </li>
        ))}
      </ul>
      {block.forecast ? (
        <p className="text-zinc-400" style={{ fontSize: 12, marginTop: 12, lineHeight: '16px' }}>
          Forecast: {block.forecast}
        </p>
      ) : null}
    </Card>
  );
}

export function InsightCard({ block }: { block: InsightBlock }) {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return (
    <Card
      id={block.id}
      title={block.title}
      subtitle="Grounded in the SQL output and chart above"
      action={<StatusBadge status="success" label="Ready" />}
    >
      <p className="text-zinc-100" style={{ fontSize: 14, lineHeight: '20px' }}>{block.summary}</p>
      <h4 className="text-zinc-400" style={{ fontSize: 12, fontWeight: 600, marginTop: 12, marginBottom: 4 }}>
        Recommendation
      </h4>
      <p className="text-zinc-100" style={{ fontSize: 14, lineHeight: '20px' }}>{block.recommendation}</p>
      {block.evidence.length > 0 ? (
        <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }} aria-label="Evidence links">
          {block.evidence.map((e) => (
            <button
              key={e.targetId + e.label}
              type="button"
              onClick={() => scrollTo(e.targetId)}
              className="ws-interactive rounded-lg border border-zinc-800/50 bg-zinc-900 px-2.5 py-1 text-zinc-400 hover:text-zinc-100"
              style={{ fontSize: 12 }}
            >
              Evidence: {e.label} →
            </button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
