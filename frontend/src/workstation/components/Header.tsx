export function Header({
  datasetName,
  activeQuestion,
  backendOnline,
  onExport,
  canExport,
}: {
  datasetName: string;
  activeQuestion: string;
  backendOnline: boolean | null;
  onExport: () => void;
  canExport: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800/50 bg-zinc-950">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={`inline-block rounded-full ${backendOnline ? 'bg-emerald-500' : backendOnline === false ? 'bg-red-500' : 'bg-zinc-600'}`}
            style={{ width: 6, height: 6 }}
          />
          <span className="sr-only">
            {backendOnline ? 'Backend online' : backendOnline === false ? 'Backend offline' : 'Backend status unknown'}
          </span>
          <h1 className="truncate text-zinc-100" style={{ fontSize: 14, fontWeight: 600 }}>
            {datasetName || 'AgentInsight AI'}
          </h1>
          {datasetName ? (
            <span className="hidden truncate text-zinc-500 sm:inline" style={{ fontSize: 12 }}>
              / {activeQuestion || 'analyst workstation'}
            </span>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-zinc-500 md:inline" style={{ fontSize: 12 }}>
            {activeQuestion ? `Active: ${activeQuestion.slice(0, 60)}${activeQuestion.length > 60 ? '…' : ''}` : 'No active question'}
          </span>
          <button
            type="button"
            onClick={onExport}
            disabled={!canExport}
            className="ws-interactive rounded-lg border border-zinc-800/50 bg-zinc-900 px-3 py-1.5 text-zinc-100 hover:bg-zinc-800 disabled:text-zinc-500"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            Export
          </button>
        </div>
      </div>
    </header>
  );
}
