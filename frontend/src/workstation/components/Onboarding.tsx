import { useRef, useState } from 'react';

export function Onboarding({
  uploading,
  onFile,
  onSample,
}: {
  uploading: boolean;
  onFile: (file: File) => void;
  onSample: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="ws-card ws-enter" style={{ padding: 32 }}>
      <h2 className="text-zinc-100" style={{ fontSize: 24, fontWeight: 600, lineHeight: '32px' }}>
        Upload a dataset to start
      </h2>
      <p className="text-zinc-400" style={{ fontSize: 14, marginTop: 8, lineHeight: '20px', maxWidth: 560 }}>
        Drop a CSV or Excel file. The pipeline runs Data → EDA → SQL → ML → Visual → Insight
        automatically, and every step is logged in the terminal below.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload dataset by dropping a file or pressing Enter to browse"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`ws-interactive rounded-lg border border-dashed ${dragOver ? 'border-zinc-500 bg-zinc-900' : 'border-zinc-800/50 bg-zinc-950'}`}
        style={{ marginTop: 16, padding: 32, textAlign: 'center', cursor: 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        <p className="text-zinc-100" style={{ fontSize: 16, fontWeight: 600 }}>
          {uploading ? 'Processing dataset…' : 'Drag and drop your file here'}
        </p>
        <p className="text-zinc-500" style={{ fontSize: 12, marginTop: 4 }}>
          or click to browse · .csv, .xlsx, .xls
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={onSample}
          disabled={uploading}
          className="ws-interactive rounded-lg border border-zinc-800/50 bg-zinc-900 px-3 py-1.5 text-zinc-100 hover:bg-zinc-800 disabled:text-zinc-500"
          style={{ fontSize: 14, fontWeight: 500 }}
        >
          {uploading ? 'Loading sample…' : 'Use sample dataset'}
        </button>
        <span className="text-zinc-500" style={{ fontSize: 12 }}>
          12 months of orders, revenue, and categories — no upload needed.
        </span>
      </div>
    </div>
  );
}
