# Trade Journal MCP Server

This project is a **Model Context Protocol (MCP) server** plus a backend service layer for importing, validating, storing, and analyzing trading data.

The goal is to make trade analysis **deterministic, inspectable, and reproducible** by combining:

- schema-validated trade ingestion
- persistent database storage
- user-scoped analytics
- MCP tools for analysis over stored trade data

It is designed so an AI can answer questions about trading performance by calling **trusted analytics tools**, instead of reasoning directly over raw CSV text.

---

## Why this project exists

Trading data is sensitive to small mistakes:

- incorrect date parsing
- silent string-to-number coercion
- misinterpreted trade direction
- inconsistent aggregation logic
- bad rows getting mixed into analysis

Letting a language model reason directly over raw CSV is risky.

This project avoids that by using:

- **structured ingestion**
- **shared schemas**
- **deterministic analytics**
- **persistent, user-scoped storage**
- **explicit MCP tools**

That means:

- calculations are reproducible
- invalid rows are surfaced explicitly
- analytics are grounded in validated stored data
- the model does not invent financial metrics

---

## Current status

### Built
- Supabase Postgres connection
- user-scoped database schema
- repository layer for imports and trades
- CSV preview + commit import flow
- invalid row tracking via `import_errors`
- DB-backed analytics tools
- MCP tool registration for analytics

### Not built yet
- frontend UI
- auth UI flow
- chatbox / LLM orchestration layer
- xlsx import
- production API routes for app usage

---

## Core architecture

### Import flow
CSV input  
→ CSV parser  
→ row normalization  
→ schema validation  
→ preview valid rows + errors  
→ commit valid rows to database  
→ store invalid rows in `import_errors`

### Analytics flow
Stored trades in Postgres  
→ repository layer  
→ analytics service layer  
→ deterministic analytics functions  
→ MCP tools

---

## Key design principles

### 1. Shared schemas at the boundaries
The project uses shared Zod schemas for transport/input validation so tool inputs and imported trade shapes stay consistent.

### 2. Persistent, user-scoped storage
Trades are stored in Postgres and tied to a Supabase Auth user via `user_id`.

### 3. Preview before commit
Imports are split into:
- preview
- commit

This makes bad rows visible before persistence and mirrors real ingestion systems.

### 4. Deterministic analytics
Analytics are implemented as pure computations over validated trade data.
There is:
- no model-generated math
- no hidden state
- no probabilistic aggregation logic

### 5. MCP for analysis, not ingestion
Import is now treated as an application workflow in the service layer.
MCP is reserved for querying and analyzing stored trade data.

---

## Database schema

### `trade_imports`
Tracks each import session.

Fields include:
- `id`
- `user_id`
- `file_name`
- `source`
- `status`
- `total_rows`
- `valid_rows`
- `invalid_rows`
- `columns`
- `warnings`
- `created_at`

### `trades`
Stores normalized valid trades.

Fields include:
- `id`
- `import_id`
- `user_id`
- `external_id`
- `symbol`
- `side`
- `entered_at`
- `exited_at`
- `entry_price`
- `exit_price`
- `size`
- `fees`
- `pnl`
- `raw_data`
- `created_at`

### `import_errors`
Stores invalid rows from an import.

Fields include:
- `id`
- `import_id`
- `row_number`
- `error_message`
- `raw_data`
- `created_at`

---

## Current analytics / MCP tools

### `dataset_info`
Returns dataset metadata and high-level stats, including:
- row count
- imported columns
- warnings
- symbols traded
- side counts
- pnl / fees / net
- open trade count
- duration stats

### `pnl_summary`
Returns overall PnL metrics and optional grouped breakdowns.

### `win_rate`
Returns:
- trade count
- wins
- losses
- breakeven
- win rate

### `performance_by_symbol`
Groups performance by symbol.

### `performance_by_side`
Groups performance by side (`Long` / `Short`).

### `performance_by_day_of_week`
Groups performance by weekday.

### `largest_win_loss`
Returns the largest winning trade and largest losing trade.

---

## Example CSV

```csv
Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Size,Type,Fees,PnL
1,NQ,2026-01-09T14:30:00Z,2026-01-09T14:42:00Z,16980.00,17005.50,1,Long,2.50,23.00
2,ES,2026-01-10T15:05:00Z,2026-01-10T15:25:00Z,4818.00,4826.50,1,Long,2.25,6.25