'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { z } from 'zod';
import {
  DatasetInfoResponseSchema,
  PnlSummaryResponseSchema,
  type DatasetInfoResponse,
  type PnlSummaryResponse,
} from '@trade/shared';

export default function DashboardPage() {
  const params = useParams<{ datasetId: string }>();
  const datasetId = params?.datasetId;

  const [info, setInfo] = useState<DatasetInfoResponse | null>(null);
  const [summary, setSummary] = useState<PnlSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) return; // wait until params available

    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const infoRes = await fetch(`/api/datasets/${datasetId}/info`, {
          method: 'GET',
        });
      const infoJson: any = await infoRes.json();
      if (!infoRes.ok) {
        throw new Error(
          infoJson?.error?.message ?? infoJson?.error ?? 'dataset info failed',
        );
      }
        const parsedInfo = DatasetInfoResponseSchema.parse(infoJson);

        const pnlRes = await fetch(`/api/datasets/${datasetId}/pnl-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupBy: 'tradeDay' }),
        });
        const pnlJson: unknown = await pnlRes.json();
        if (!pnlRes.ok) throw new Error('pnl summary failed');
        const parsedPnl = PnlSummaryResponseSchema.parse(pnlJson);

        if (!cancelled) {
          setInfo(parsedInfo);
          setSummary(parsedPnl);
        }
      } catch (e: unknown) {
        if (cancelled) return;

        if (e instanceof z.ZodError) {
          setError(
            `Response shape mismatch: ${e.issues[0]?.message ?? 'invalid'}`,
          );
        } else {
          setError(e instanceof Error ? e.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  if (!datasetId) return <div className="p-8">Loading…</div>;
  if (loading) return <div className="p-8">Loading…</div>;
  if (error) return <div className="p-8 text-red-700">{error}</div>;

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="rounded border p-4">
        <div className="text-sm text-gray-600">Dataset</div>
        <div className="font-mono text-sm">{datasetId}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border p-4">
          <div className="font-medium mb-2">Dataset Info</div>
          <pre className="text-xs rounded p-3 overflow-auto">
            {JSON.stringify(info, null, 2)}
          </pre>
        </div>

        <div className="rounded border p-4">
          <div className="font-medium mb-2">PnL Summary</div>
          <pre className="text-xs rounded p-3 overflow-auto">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
