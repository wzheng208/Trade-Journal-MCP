import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const { loadTradesTool } = await import('../mcp/tools/loadTrades.js');
const { datasetInfoTool } = await import('../mcp/tools/datasetInfo.js');
const { pnlSummaryTool } = await import('../mcp/tools/pnlSummary.js');

const TEST_USER_ID = process.env.TEST_USER_ID;

if (!TEST_USER_ID) {
  throw new Error('Missing TEST_USER_ID in environment');
}

const csvText = `Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Size,Type,Fees,PnL
1,NQ,2026-01-09T14:30:00Z,2026-01-09T14:42:00Z,16980.00,17005.50,1,Long,2.50,23.00
2,ES,2026-01-10T15:05:00Z,2026-01-10T15:25:00Z,4818.00,4826.50,1,Long,2.25,6.25`;

const loadResult = await loadTradesTool({
  userId: TEST_USER_ID,
  csvText,
});

console.log('LOAD RESULT');
console.dir(loadResult, { depth: null });

if (!loadResult.datasetId) {
  throw new Error('loadTradesTool did not return a datasetId');
}

const datasetInfoResult = await datasetInfoTool({
  userId: TEST_USER_ID,
  datasetId: loadResult.datasetId,
});

console.log('\nDATASET INFO RESULT');
console.dir(datasetInfoResult, { depth: null });

const pnlSummaryResult = await pnlSummaryTool({
  userId: TEST_USER_ID,
  groupBy: 'symbol',
});

console.log('\nPNL SUMMARY RESULT');
console.dir(pnlSummaryResult, { depth: null });

process.exit(0);
