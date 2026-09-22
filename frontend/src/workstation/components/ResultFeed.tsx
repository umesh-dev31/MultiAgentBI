import type { FeedBlock } from '../types';
import { AnomalyCard, ChartCard, InsightCard, SqlCard } from './ResultCards';

export function ResultFeed({ blocks }: { blocks: FeedBlock[] }) {
  if (blocks.length === 0) {
    return (
      <div className="ws-card" style={{ padding: 24 }} role="status">
        <h2 className="text-zinc-100" style={{ fontSize: 16, fontWeight: 600 }}>Results will appear here</h2>
        <p className="text-zinc-400" style={{ fontSize: 14, marginTop: 8, lineHeight: '20px', maxWidth: 560 }}>
          Ask a question about the loaded dataset. Answers render as separate SQL, chart, anomaly,
          and recommendation cards so each step can be inspected independently.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {blocks.map((b) => {
        if (b.kind === 'sql') return <SqlCard key={b.id} block={b} />;
        if (b.kind === 'chart') return <ChartCard key={b.id} block={b} />;
        if (b.kind === 'anomaly') return <AnomalyCard key={b.id} block={b} />;
        if (b.kind === 'insight') return <InsightCard key={b.id} block={b} />;
        return (
          <div key={b.id} className="ws-card" style={{ padding: 16 }}>
            <p className="text-zinc-400" style={{ fontSize: 14 }}>{b.text}</p>
          </div>
        );
      })}
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading results">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ws-card" style={{ padding: 16 }}>
          <div className="ws-skeleton" style={{ height: 16, width: `${[38, 52, 30][i]}%` }} />
          <div className="ws-skeleton" style={{ height: 12, width: '72%', marginTop: 8 }} />
          <div className="ws-skeleton" style={{ height: 120, width: '100%', marginTop: 12 }} />
          <span className="sr-only">Loading result card…</span>
        </div>
      ))}
    </div>
  );
}
