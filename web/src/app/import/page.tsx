'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import {
  LoadTradesInputSchema,
  LoadTradesResponseSchema,
  type LoadTradesResponse,
} from '@trade/shared';

type ApiError = {
  error: string;
  details?: unknown;
};

export default function ImportPage() {
  const router = useRouter();
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState<LoadTradesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = csvText.trim().length > 0 && !loading;

  async function handleImport() {
    if (!canSubmit) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // ✅ validate request using shared schema
      const reqBody = LoadTradesInputSchema.parse({ csvText });

      const res = await fetch('/api/trades/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const apiErr = data as ApiError;
        setError(apiErr?.error ?? 'Failed to import trades');
        return;
      }

      // ✅ validate response using shared schema
      const parsed = LoadTradesResponseSchema.parse(data);

      setResult(parsed);
      router.push(`/dashboard/${parsed.datasetId}`);
      setCsvText('');
    } catch (e: unknown) {
      if (e instanceof z.ZodError) {
        setError(e.issues[0]?.message ?? 'Invalid input/response');
      } else {
        setError(e instanceof Error ? e.message : 'Network error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Import Trade Journal</h1>
        <p className="text-sm text-gray-600">
          Paste your CSV export here. We’ll parse it, normalize it, and create a
          dataset.
        </p>
      </div>

      <div className="space-y-2">
        <textarea
          className="w-full h-56 rounded border p-3 text-sm font-mono"
          placeholder="Paste CSV here…"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            disabled={!canSubmit}
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {loading ? 'Importing…' : 'Import'}
          </button>

          <button
            type="button"
            onClick={() => {
              setCsvText('');
              setResult(null);
              setError(null);
            }}
            disabled={loading}
            className="rounded border px-4 py-2 text-sm disabled:opacity-50"
          >
            Clear
          </button>

          <span className="text-xs text-gray-500">
            {csvText.trim().length.toLocaleString()} chars
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded border p-4 space-y-2">
          <div className="text-sm space-y-1">
            <div>
              <span className="font-medium">Dataset:</span> {result.datasetId}
            </div>
            <div>
              <span className="font-medium">Rows loaded:</span>{' '}
              {result.rowCount}
            </div>
            <div className="text-xs text-gray-600">
              Columns: {result.columns.join(', ')}
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="text-sm">
              <div className="font-medium text-amber-800">Warnings</div>
              <ul className="list-disc pl-5 text-amber-800">
                {result.warnings.slice(0, 30).map((w, i) => (
                  <li key={`${i}-${w}`}>{w}</li>
                ))}
              </ul>
              {result.warnings.length > 30 && (
                <div className="text-xs text-gray-600 mt-1">
                  Showing first 30 of {result.warnings.length}.
                </div>
              )}
            </div>
          )}

          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600">
              Raw response
            </summary>
            <pre className="mt-2 bg-gray-100 rounded p-3 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
