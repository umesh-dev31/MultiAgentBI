import { useEffect, useRef } from 'react';
import type { AgentState, TerminalLine } from '../types';
import { AGENT_ORDER, AGENT_LABELS } from '../types';

function icon(status: AgentState['status'] | TerminalLine['status']) {
  if (status === 'done') return <span aria-hidden className="text-emerald-400">✓</span>;
  if (status === 'running') return <span aria-hidden className="text-amber-400">▸</span>;
  if (status === 'error') return <span aria-hidden className="text-red-400">✕</span>;
  return <span aria-hidden className="text-zinc-500">○</span>;
}

export function PipelineStrip({ agents }: { agents: AgentState[] }) {
  return (
    <ol aria-label="Agent pipeline progress" className="flex flex-wrap items-center gap-2">
      {AGENT_ORDER.map((id, i) => {
        const s = agents.find((a) => a.id === id)?.status ?? 'idle';
        return (
          <li key={id} className="flex items-center gap-2">
            <span
              className={`ws-interactive inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${
                s === 'done'
                  ? 'border-emerald-800/50 text-emerald-400'
                  : s === 'running'
                    ? 'border-amber-800/50 text-amber-400'
                    : s === 'error'
                      ? 'border-red-800/50 text-red-400'
                      : 'border-zinc-800/50 text-zinc-500'
              } bg-zinc-900`}
              style={{ fontSize: 12 }}
              aria-label={`${AGENT_LABELS[id]}: ${s}`}
            >
              {icon(s)} {AGENT_LABELS[id]}
            </span>
            {i < AGENT_ORDER.length - 1 ? (
              <span aria-hidden className="text-zinc-700">→</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function AgentTerminal({ lines, live }: { lines: TerminalLine[]; live: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <section aria-label="Agent activity log" className="ws-card" style={{ padding: 0 }}>
      <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-2.5">
        <h2 className="text-zinc-400" style={{ fontSize: 12, fontWeight: 600 }}>
          Agent activity
        </h2>
        <span className="text-zinc-500" style={{ fontSize: 12 }} aria-live="polite">
          {live ? 'live' : `${lines.length} events`}
        </span>
      </div>
      <div
        ref={ref}
        role="log"
        aria-live="polite"
        tabIndex={0}
        className="overflow-y-auto px-2 py-1"
        style={{ maxHeight: 180, fontFamily: 'var(--font-mono)' }}
      >
        {lines.length === 0 ? (
          <p className="px-2 py-3 text-zinc-500" style={{ fontSize: 12 }}>
            No agent activity yet. Upload a dataset or ask a question to start the pipeline.
          </p>
        ) : (
          lines.map((l) => (
            <p key={l.id} className="flex gap-2 px-2 py-1 text-zinc-400" style={{ fontSize: 12, lineHeight: '20px' }}>
              <span aria-hidden>{icon(l.status)}</span>
              <span className="shrink-0 text-zinc-500">{l.time}</span>
              <span>
                <span className="text-zinc-100">{l.agent}:</span> {l.text}
              </span>
            </p>
          ))
        )}
      </div>
    </section>
  );
}
