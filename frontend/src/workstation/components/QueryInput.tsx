import { useState } from 'react';

export function QueryInput({
  disabled,
  busy,
  suggested,
  onSubmit,
}: {
  disabled: boolean;
  busy: boolean;
  suggested: string[];
  onSubmit: (question: string) => void;
}) {
  const [value, setValue] = useState('');

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || disabled || busy) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <div className="ws-card" style={{ padding: 16 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <label htmlFor="ws-query" className="text-zinc-400" style={{ fontSize: 12, fontWeight: 500 }}>
          Ask a question about the dataset
        </label>
        <div className="flex flex-col gap-2 sm:flex-row" style={{ marginTop: 8 }}>
          <input
            id="ws-query"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={disabled ? 'Upload a dataset to enable questions' : 'e.g. What is total revenue per month?'}
            disabled={disabled || busy}
            autoComplete="off"
            className="ws-interactive min-w-0 flex-1 rounded-lg border border-zinc-800/50 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-500"
            style={{ fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={disabled || busy || !value.trim()}
            className="ws-interactive rounded-lg border border-zinc-800/50 bg-zinc-100 px-4 py-2 text-zinc-950 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            {busy ? 'Running…' : 'Ask'}
          </button>
        </div>
      </form>
      {suggested.length > 0 ? (
        <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }} aria-label="Suggested questions">
          {suggested.slice(0, 4).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => submit(q)}
              disabled={disabled || busy}
              className="ws-interactive rounded-lg border border-zinc-800/50 bg-zinc-900 px-2.5 py-1 text-left text-zinc-400 hover:text-zinc-100 disabled:text-zinc-500"
              style={{ fontSize: 12 }}
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
