import { AGENT_LABELS, AGENT_ORDER, type AgentState } from '../types';

function Dot({ status }: { status: AgentState['status'] }) {
  const cls =
    status === 'done'
      ? 'bg-emerald-500'
      : status === 'running'
        ? 'bg-amber-400'
        : status === 'error'
          ? 'bg-red-500'
          : 'bg-zinc-700';
  return (
    <span aria-hidden className={`inline-block rounded-full ${cls}`} style={{ width: 6, height: 6 }} />
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  datasetName,
  onUploadClick,
  onSampleClick,
  uploading,
  history,
  onSelectHistory,
  activeHistoryId,
  agents,
}: {
  collapsed: boolean;
  onToggle: () => void;
  datasetName: string;
  onUploadClick: () => void;
  onSampleClick: () => void;
  uploading: boolean;
  history: { id: string; question: string; createdAt: string; status: 'done' | 'error' }[];
  onSelectHistory: (id: string) => void;
  activeHistoryId: string | null;
  agents: AgentState[];
}) {
  return (
    <aside
      aria-label="Workstation sidebar"
      className="flex h-full flex-col border-r border-zinc-800/50 bg-zinc-950"
      style={{ width: collapsed ? 56 : 264 }}
    >
      <div className="flex items-center justify-between gap-2 p-3">
        {!collapsed && (
          <p className="text-zinc-100" style={{ fontSize: 14, fontWeight: 600 }}>
            AgentInsight AI
          </p>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="ws-interactive rounded-lg border border-zinc-800/50 bg-zinc-900 px-2 py-1 text-zinc-400 hover:text-zinc-100"
          style={{ fontSize: 12 }}
        >
          {collapsed ? '▸' : '◂'}
        </button>
      </div>

      <div className="border-t border-zinc-800/50 p-3">
        <p className="text-zinc-500" style={{ fontSize: 12, marginBottom: 8 }}>
          {!collapsed ? 'Dataset' : 'Data'}
        </p>
        {!collapsed ? (
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900 p-3">
            <p className="truncate text-zinc-100" style={{ fontSize: 14, fontWeight: 500 }} title={datasetName}>
              {datasetName || 'No dataset loaded'}
            </p>
            <p className="text-zinc-500" style={{ fontSize: 12, marginTop: 4 }}>
              {datasetName ? 'Active source for all agents' : 'Upload a CSV to begin'}
            </p>
            <div className="flex gap-2" style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={onUploadClick}
                disabled={uploading}
                className="ws-interactive flex-1 rounded-lg border border-zinc-800/50 bg-zinc-900 px-2 py-1.5 text-zinc-100 hover:bg-zinc-800 disabled:text-zinc-500"
                style={{ fontSize: 12, fontWeight: 500 }}
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <button
                type="button"
                onClick={onSampleClick}
                disabled={uploading}
                className="ws-interactive flex-1 rounded-lg border border-zinc-800/50 bg-zinc-900 px-2 py-1.5 text-zinc-400 hover:text-zinc-100 disabled:text-zinc-500"
                style={{ fontSize: 12 }}
              >
                Sample
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onUploadClick}
            aria-label="Upload dataset"
            className="ws-interactive w-full rounded-lg border border-zinc-800/50 bg-zinc-900 py-2 text-zinc-100"
          >
            +
          </button>
        )}
      </div>

      <div className="border-t border-zinc-800/50 p-3">
        <p className="text-zinc-500" style={{ fontSize: 12, marginBottom: 8 }}>
          {!collapsed ? 'Agent pipeline' : 'Agents'}
        </p>
        <ol className="flex flex-col gap-1.5" aria-label="Agent pipeline status">
          {AGENT_ORDER.map((id) => {
            const a = agents.find((x) => x.id === id);
            const status = a?.status ?? 'idle';
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-lg border border-zinc-800/50 bg-zinc-900 px-2 py-1.5"
                title={a?.detail || AGENT_LABELS[id]}
              >
                <Dot status={status} />
                {!collapsed && (
                  <>
                    <span className="text-zinc-100" style={{ fontSize: 12 }}>{AGENT_LABELS[id]}</span>
                    <span className="ml-auto text-zinc-500" style={{ fontSize: 12 }}>
                      {status === 'done' ? 'done' : status === 'running' ? 'working' : status === 'error' ? 'error' : 'idle'}
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-800/50 p-3">
        <p className="text-zinc-500" style={{ fontSize: 12, marginBottom: 8 }}>
          {!collapsed ? 'Query history' : 'History'}
        </p>
        {history.length === 0 ? (
          !collapsed ? (
            <p className="rounded-lg border border-zinc-800/50 bg-zinc-900 p-3 text-zinc-500" style={{ fontSize: 12, lineHeight: '16px' }}>
              No queries yet. Ask a question above and it will appear here.
            </p>
          ) : null
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto" aria-label="Past queries">
            {history.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => onSelectHistory(h.id)}
                  aria-current={h.id === activeHistoryId ? 'true' : undefined}
                  className={`ws-interactive w-full rounded-lg border px-2 py-1.5 text-left ${
                    h.id === activeHistoryId
                      ? 'border-zinc-700 bg-zinc-800 text-zinc-100'
                      : 'border-zinc-800/50 bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {!collapsed ? (
                    <>
                      <span className="block truncate" style={{ fontSize: 12 }}>{h.question}</span>
                      <span className="block text-zinc-500" style={{ fontSize: 12, marginTop: 2 }}>{h.createdAt}</span>
                    </>
                  ) : (
                    <span className="block text-center" style={{ fontSize: 12 }} title={h.question}>•</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
