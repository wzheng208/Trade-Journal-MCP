import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pnlSummaryTool, pnlSummaryInputSchema } from '@mcp/tools/pnlSummary';

const BodySchema = pnlSummaryInputSchema.omit({ datasetId: true });

export async function POST(
  req: Request,
  ctx: { params: Promise<{ datasetId: string }> },
) {
  try {
    const { datasetId } = await ctx.params;

    const body: unknown = await req.json();
    const filters = BodySchema.parse(body);

    const parsed = pnlSummaryInputSchema.parse({ datasetId, ...filters });
    const result = await pnlSummaryTool(parsed);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: err.flatten() },
        { status: 400 },
      );
    }
    const message =
      err instanceof Error ? err.message : 'Failed to fetch pnl summary';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
