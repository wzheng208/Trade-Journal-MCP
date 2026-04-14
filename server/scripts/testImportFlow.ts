import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const TEST_USER_ID = '9751bbbe-492c-4d00-aaf0-a709f861388d';

if (!TEST_USER_ID) {
  throw new Error('TEST_USER_ID is missing in server/.env');
}

const { previewTradeImport, commitTradeImport } =
  await import('../services/tradeImportService.js');

const csvText = `Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Size,Type,Fees,PnL
1,NQ,2026-01-09T14:30:00Z,2026-01-09T14:42:00Z,16980.00,17005.50,1,Long,2.50,23.00
2,ES,2026-01-10T15:05:00Z,2026-01-10T15:25:00Z,4818.00,4826.50,1,Long,2.25,6.25
3,NQ,INVALID_DATE,2026-01-10T15:25:00Z,4818.00,4826.50,1,Long,2.25,6.25`;

const preview = await previewTradeImport({
  csvText,
  fileName: 'test-import.csv',
});

console.log('\nPREVIEW RESULT');
console.dir(preview, { depth: null });

const commit = await commitTradeImport({
  userId: TEST_USER_ID,
  preview,
  source: 'csv',
});

console.log('\nCOMMIT RESULT');
console.dir(commit, { depth: null });

process.exit(0);
