export type AgentId = 'data' | 'eda' | 'sql' | 'ml' | 'visual' | 'insight';

export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

export interface AgentState {
  id: AgentId;
  label: string;
  status: AgentStatus;
  detail?: string;
  durationMs?: number;
}

export interface TerminalLine {
  id: string;
  agent: string;
  text: string;
  status: AgentStatus;
  time: string;
}

export type FeedBlockKind = 'sql' | 'chart' | 'anomaly' | 'insight' | 'note';

export interface SqlBlock {
  kind: 'sql';
  id: string;
  question: string;
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface ChartBlock {
  kind: 'chart';
  id: string;
  title: string;
  points: { month: string; revenue: number; orders: number }[];
}

export interface AnomalyItem {
  label: string;
  detail: string;
  severity: 'warning' | 'error';
}

export interface AnomalyBlock {
  kind: 'anomaly';
  id: string;
  title: string;
  items: AnomalyItem[];
  forecast?: string;
}

export interface EvidenceLink {
  label: string;
  targetId: string;
}

export interface InsightBlock {
  kind: 'insight';
  id: string;
  title: string;
  summary: string;
  recommendation: string;
  evidence: EvidenceLink[];
}

export interface NoteBlock {
  kind: 'note';
  id: string;
  text: string;
}

export type FeedBlock = SqlBlock | ChartBlock | AnomalyBlock | InsightBlock | NoteBlock;

export interface QueryHistoryEntry {
  id: string;
  question: string;
  datasetId: number | null;
  createdAt: string;
  status: 'done' | 'error';
}

export const AGENT_ORDER: AgentId[] = ['data', 'eda', 'sql', 'ml', 'visual', 'insight'];

export const AGENT_LABELS: Record<AgentId, string> = {
  data: 'Data',
  eda: 'EDA',
  sql: 'SQL',
  ml: 'ML',
  visual: 'Visual',
  insight: 'Insight',
};
