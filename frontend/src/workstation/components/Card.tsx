import type { CSSProperties, ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  action,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="ws-card ws-enter scroll-mt-24"
      style={{ padding: 16 } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-4" style={{ marginBottom: 12 }}>
        <div>
          <h3 className="text-zinc-100" style={{ fontSize: 16, fontWeight: 600, lineHeight: '24px' }}>{title}</h3>
          {subtitle ? (
            <p className="text-zinc-400" style={{ fontSize: 12, lineHeight: '16px', marginTop: 4 }}>{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ status, label }: { status: 'success' | 'warning' | 'error' | 'muted'; label: string }) {
  const map = {
    success: 'border-emerald-800/50 bg-emerald-950/40 text-emerald-400',
    warning: 'border-amber-800/50 bg-amber-950/40 text-amber-400',
    error: 'border-red-800/50 bg-red-950/40 text-red-400',
    muted: 'border-zinc-800/50 bg-zinc-900 text-zinc-400',
  } as const;
  return (
    <span
      className={`ws-interactive inline-flex items-center rounded-lg border px-2 py-0.5 ${map[status]}`}
      style={{ fontSize: 12, fontWeight: 500 }}
    >
      {label}
    </span>
  );
}
