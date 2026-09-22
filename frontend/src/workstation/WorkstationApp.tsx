import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { QueryInput } from './components/QueryInput';
import { AgentTerminal, PipelineStrip } from './components/AgentTerminal';
import { FeedSkeleton, ResultFeed } from './components/ResultFeed';
import { Onboarding } from './components/Onboarding';
import type {
  AgentId,
  AgentState,
  AnomalyBlock,
  ChartBlock,
  FeedBlock,
  InsightBlock,
  QueryHistoryEntry,
  SqlBlock,
  TerminalLine,
} from './types';
import { AGENT_ORDER } from './types';
import type { PipelineRunResponse } from '../types/data';

const BACKEND_URL = 'http://localhost:8000';

const SAMPLE_CSV = `order_id,order_date,category,quantity,unit_price,revenue
1,2025-01-05,Electronics,2,499.99,999.98
2,2025-02-11,Home,4,89.50,358.00
3,2025-03-03,Electronics,1,1299.00,1299.00
4,2025-04-19,Apparel,6,45.00,270.00
5,2025-05-08,Home,3,120.00,360.00
6,2025-06-21,Electronics,5,199.99,999.95
7,2025-07-14,Apparel,10,38.50,385.00
8,2025-08-02,Home,2,240.00,480.00
9,2025-09-17,Electronics,3,549.00,1647.00
10,2025-10-09,Apparel,8,42.00,336.00
11,2025-11-23,Home,5,99.99,499.95
12,2025-12-15,Electronics,4,399.00,1596.00
`;

function now() {
  return new Date().toLocaleTimeString([], { hour12: false });
}

function initialAgents(): AgentState[] {
  return AGENT_ORDER.map((id) => ({
    id,
    label: id,
    status: 'idle' as const,
  }));
}

function toTerminal(lines: { step?: string; step_name?: string; status: string; details?: string; duration_seconds?: number; duration_sec?: number }[]): TerminalLine[] {
  return lines.map((l, i) => {
    const name = l.step ?? l.step_name ?? 'pipeline';
    const ok = l.status === 'success';
    return {
      id: `log-${i}-${name}`,
      agent: name,
      text: `${l.details ?? (ok ? 'completed' : 'failed')}`,
      status: ok ? 'done' : 'error',
      time: now(),
    };
  });
}

function buildBlocksFromPipeline(data: PipelineRunResponse, prefix: string): FeedBlock[] {
  const blocks: FeedBlock[] = [];
  const trend = data.eda_result?.monthly_trend ?? [];
  if (trend.length > 0) {
    const chart: ChartBlock = {
      kind: 'chart',
      id: `${prefix}-chart`,
      title: 'Monthly revenue and orders',
      points: trend.map((t) => ({
        month: t.month,
        revenue: Number(t.total_revenue ?? 0),
        orders: Number(t.total_orders ?? 0),
      })),
    };
    blocks.push(chart);
  }

  const ml = data.ml_result as unknown as {
    anomalies?: { anomaly_count?: number; anomalies?: { label?: string; reason?: string; explanation?: string; severity?: string }[] };
    forecast?: { summary?: string; trend_direction?: string; next_months?: unknown };
  } | null;
  const rawAnoms = ml?.anomalies?.anomalies ?? [];
  const anomalyBlock: AnomalyBlock = {
    kind: 'anomaly',
    id: `${prefix}-anomalies`,
    title: 'Anomalies and forecast',
    items: rawAnoms.slice(0, 6).map((a, i) => ({
      label: a.label ?? `Anomaly ${i + 1}`,
      detail: a.reason ?? a.explanation ?? 'Category-relative outlier detected by Isolation Forest.',
      severity: String(a.severity ?? '').toLowerCase().includes('high') ? 'error' : 'warning',
    })),
    forecast:
      ml?.forecast?.summary ??
      (ml?.forecast?.trend_direction ? `Trend direction: ${ml.forecast.trend_direction}.` : undefined),
  };
  blocks.push(anomalyBlock);

  const insight = data.insight_result as unknown as {
    summary?: string;
    key_finding?: string;
    recommendation?: string;
  } | null;
  const summary = insight?.summary ?? insight?.key_finding ?? 'Pipeline complete. Review the chart and SQL output above.';
  const recommendation = insight?.recommendation ?? 'Validate the flagged anomalies against source orders before acting.';
  const evidence = blocks
    .filter((b) => b.kind === 'chart' || b.kind === 'anomaly')
    .map((b) => ({
      label: b.kind === 'chart' ? 'chart' : 'anomalies',
      targetId: b.id,
    }));
  const insightBlock: InsightBlock = {
    kind: 'insight',
    id: `${prefix}-insight`,
    title: 'Business recommendation',
    summary,
    recommendation,
    evidence,
  };
  blocks.push(insightBlock);
  return blocks;
}

export function WorkstationApp() {
  const [collapsed, setCollapsed] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [queryBusy, setQueryBusy] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>(initialAgents);
  const [terminal, setTerminal] = useState<TerminalLine[]>([]);
  const [blocks, setBlocks] = useState<FeedBlock[]>([]);
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState('');
  const [suggested, setSuggested] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  const pushLine = useCallback((line: Omit<TerminalLine, 'id' | 'time'>) => {
    setTerminal((prev) => [...prev, { ...line, id: `t-${Date.now()}-${prev.length}`, time: now() }]);
  }, []);

  const setAgent = useCallback((id: AgentId, patch: Partial<AgentState>) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${BACKEND_URL}/health`);
        if (!cancelled) setBackendOnline(res.ok);
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    }
    check();
    const t = window.setInterval(check, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => stopPolling, []);

  const refreshSuggested = useCallback(async (id: number | null) => {
    try {
      const url = id ? `${BACKEND_URL}/api/suggested-questions?dataset_id=${id}` : `${BACKEND_URL}/api/suggested-questions`;
      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      const qs: string[] = (json.questions ?? [])
        .map((q: { question?: string; text?: string } | string) =>
          typeof q === 'string' ? q : (q.question ?? q.text ?? ''),
        )
        .filter(Boolean);
      setSuggested(qs.slice(0, 4));
    } catch {
      /* keep previous suggestions */
    }
  }, []);

  const handlePipelineResponse = useCallback(
    (data: PipelineRunResponse, runLabel: string) => {
      if (data.dataset_id) setDatasetId(data.dataset_id);
      setBlocks(buildBlocksFromPipeline(data, runLabel));
      const logs = (data.execution_logs ?? []) as Parameters<typeof toTerminal>[0];
      setTerminal((prev) => [...prev, ...toTerminal(logs)]);
      setAgents((prev) =>
        prev.map((a) => (a.id === 'sql' ? a : { ...a, status: 'done' as const })),
      );
      refreshSuggested(data.dataset_id ?? null);
    },
    [refreshSuggested],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      setAgents(initialAgents().map((a) => (a.id === 'data' ? { ...a, status: 'running' as const } : a)));
      pushLine({ agent: 'Data', text: `uploading ${file.name}…`, status: 'running' });

      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const form = new FormData();
      form.append('file', file);

      pollRef.current = window.setInterval(async () => {
        try {
          const r = await fetch(`${BACKEND_URL}/api/pipeline/status/${runId}`);
          if (!r.ok) return;
          const s = await r.json();
          const stages = s.stages ?? {};
          const nodeMap: Record<string, AgentId> = {
            data_cleaning_node: 'data',
            validation_node: 'data',
            eda_node: 'eda',
            ml_node: 'ml',
            visualization_node: 'visual',
            insight_node: 'insight',
          };
          Object.entries(stages as Record<string, { status?: string; details?: string; duration_ms?: number }>).forEach(
            ([node, st]) => {
              const agent = nodeMap[node];
              if (!agent) return;
              setAgent(agent, {
                status: st.status === 'completed' ? 'done' : st.status === 'failed' ? 'error' : 'running',
                detail: st.details,
                durationMs: st.duration_ms,
              });
            },
          );
        } catch {
          /* polling is best-effort */
        }
      }, 800);

      try {
        const res = await fetch(`${BACKEND_URL}/api/pipeline/run?run_id=${runId}`, {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail ?? `Pipeline failed (HTTP ${res.status})`);
        }
        const data = (await res.json()) as PipelineRunResponse;
        setDatasetName(data.filename || file.name);
        setBackendOnline(true);
        pushLine({ agent: 'pipeline', text: `completed ${data.filename || file.name}`, status: 'done' });
        handlePipelineResponse(data, `run-${Date.now()}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Pipeline failed';
        setError(msg);
        pushLine({ agent: 'pipeline', text: msg, status: 'error' });
        setAgents((prev) => prev.map((a) => (a.status === 'running' ? { ...a, status: 'error' } : a)));
      } finally {
        stopPolling();
        setUploading(false);
      }
    },
    [handlePipelineResponse, pushLine, setAgent],
  );

  const useSample = useCallback(() => {
    const file = new File([SAMPLE_CSV], 'sample-monthly-orders.csv', { type: 'text/csv' });
    uploadFile(file);
  }, [uploadFile]);

  const askQuestion = useCallback(
    async (question: string) => {
      if (!datasetId) {
        setError('Upload a dataset before asking questions.');
        return;
      }
      setError(null);
      setQueryBusy(true);
      setActiveQuestion(question);
      setAgent('sql', { status: 'running', detail: question });
      pushLine({ agent: 'SQL Agent', text: `validating query: ${question}`, status: 'running' });

      const entry: QueryHistoryEntry = {
        id: `q-${Date.now()}`,
        question,
        datasetId,
        createdAt: new Date().toLocaleString(),
        status: 'done',
      };

      try {
        const res = await fetch(`${BACKEND_URL}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, dataset_id: datasetId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.detail ?? `Query failed (HTTP ${res.status})`);
        if (json.error) throw new Error(json.error);

        const rows: Record<string, unknown>[] = Array.isArray(json.result) ? json.result : [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        const sqlBlock: SqlBlock = {
          kind: 'sql',
          id: `${entry.id}-sql`,
          question,
          sql: json.generated_sql ?? '-- no SQL returned',
          columns,
          rows,
          rowCount: json.row_count ?? rows.length,
        };
        setBlocks((prev) => [...prev, sqlBlock]);
        setHistory((prev) => [entry, ...prev].slice(0, 30));
        setActiveHistoryId(entry.id);
        setAgent('sql', { status: 'done', detail: `${sqlBlock.rowCount} rows` });
        pushLine({ agent: 'SQL Agent', text: `returned ${sqlBlock.rowCount} rows`, status: 'done' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Query failed';
        setError(msg);
        setHistory((prev) => [{ ...entry, status: 'error' as const }, ...prev].slice(0, 30));
        setAgent('sql', { status: 'error', detail: msg });
        pushLine({ agent: 'SQL Agent', text: msg, status: 'error' });
      } finally {
        setQueryBusy(false);
      }
    },
    [datasetId, pushLine, setAgent],
  );

  const exportResults = useCallback(() => {
    const payload = {
      dataset: datasetName,
      dataset_id: datasetId,
      active_question: activeQuestion,
      exported_at: new Date().toISOString(),
      blocks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentinsight-${datasetId ?? 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeQuestion, blocks, datasetId, datasetName]);

  const hasDataset = datasetId !== null;
  const busy = uploading || queryBusy;

  const historyItems = useMemo(
    () => history.map((h) => ({ id: h.id, question: h.question, createdAt: h.createdAt, status: h.status })),
    [history],
  );

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f);
          e.target.value = '';
        }}
      />
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        datasetName={datasetName}
        onUploadClick={() => fileRef.current?.click()}
        onSampleClick={useSample}
        uploading={uploading}
        history={historyItems}
        onSelectHistory={(id) => {
          setActiveHistoryId(id);
          const h = history.find((x) => x.id === id);
          if (h) setActiveQuestion(h.question);
        }}
        activeHistoryId={activeHistoryId}
        agents={agents}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          datasetName={datasetName}
          activeQuestion={activeQuestion}
          backendOnline={backendOnline}
          onExport={exportResults}
          canExport={blocks.length > 0 && !busy}
        />

        <main className="min-h-0 flex-1 overflow-y-auto" aria-label="Analyst workspace">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4">
            {error ? (
              <div role="alert" className="rounded-lg border border-red-800/50 bg-red-950/40 p-3 text-red-400" style={{ fontSize: 14 }}>
                {error}
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="ws-interactive ml-3 rounded-lg border border-red-800/50 px-2 py-0.5 text-red-400"
                  style={{ fontSize: 12 }}
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            <QueryInput disabled={!hasDataset} busy={queryBusy} suggested={suggested} onSubmit={askQuestion} />

            <PipelineStrip agents={agents} />
            <AgentTerminal lines={terminal} live={busy} />

            {!hasDataset && !uploading ? (
              <Onboarding uploading={uploading} onFile={uploadFile} onSample={useSample} />
            ) : uploading && blocks.length === 0 ? (
              <FeedSkeleton />
            ) : (
              <ResultFeed blocks={blocks} />
            )}

            {queryBusy ? <FeedSkeleton /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
