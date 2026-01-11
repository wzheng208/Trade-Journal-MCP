import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  datasetInfoTool,
  datasetInfoInputSchema,
} from '@mcp/tools/datasetInfo';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ datasetId: string }> },
) {
  try {
    const { datasetId } = await ctx.params;

    const parsed = datasetInfoInputSchema.parse({ datasetId });
    const result = await datasetInfoTool(parsed);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: err.flatten() },
        { status: 400 },
      );
    }
    const message =
      err instanceof Error ? err.message : 'Failed to fetch dataset info';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
