import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadTradesTool, loadTradesInputSchema } from '@mcp/tools/loadTrades';

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    // ✅ single source of truth (shared-backed schema)
    const parsed = loadTradesInputSchema.parse(body);

    const result = await loadTradesTool(parsed);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: err.flatten() },
        { status: 400 },
      );
    }

    const message =
      err instanceof Error ? err.message : 'Failed to load trades';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
