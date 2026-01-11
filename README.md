# Trade Journal MCP Server

This project is a **Model Context Protocol (MCP) server** with a companion **Next.js dashboard** that allows an AI to safely load, normalize, and analyze real trading data from CSV trade journals using **deterministic, schema-validated tools**.

The core goal is to make trade analysis **correct, reproducible, and inspectable**, rather than relying on probabilistic reasoning over raw CSV text.

---

## Why MCP

Trading data is highly sensitive to subtle errors:

- Incorrect date parsing
- Silent string-to-number coercion
- Misinterpreted trade direction (Long vs Short)
- Inconsistent aggregation logic
- Non-reproducible calculations

Asking a language model to reason directly over raw CSV input is risky: small mistakes can lead to incorrect conclusions with real financial consequences.

Instead, this project exposes **explicit MCP tools** for ingestion and analytics.

These tools:
- Accept structured inputs
- Validate data against shared schemas
- Perform deterministic computations
- Return well-defined outputs

This ensures:
- Every calculation is reproducible
- Invalid rows are rejected or surfaced as warnings
- The AI cannot hallucinate analytics results

---

## Features

- Load broker-exported CSV trade logs
- Normalize raw CSV rows into a clean domain model
- Validate trades using shared Zod schemas (single source of truth)
- Store datasets in memory per session
- Compute dataset metadata:
  - symbols traded
  - open vs closed trades
  - trade durations
- Generate PnL analytics:
  - total PnL
  - win rate
  - average win / loss
  - expectancy
  - profit factor
- Group analytics by:
  - symbol
  - side (Long / Short)
  - trade day
- Expose the same logic via:
  - MCP tools
  - HTTP API routes
  - a simple Next.js dashboard

---

## Architecture Overview

CSV Input
↓
CSV Adapter (normalization)
↓
Shared Trade Schema (validation)
↓
Dataset Store (in-memory)
↓
Analytics Engine
↓
MCP Tools / HTTP API
↓
Next.js Dashboard

yaml
Copy code

---

## Key Design Principles

### 1. Shared contracts (single source of truth)

All core domain types and schemas live in:

packages/shared

yaml
Copy code

This includes:
- `Trade` schema
- Tool input schemas
- Analytics result schemas

These contracts are imported by:
- CSV adapter
- MCP tools
- API routes
- Frontend UI

There is **no duplicated domain typing** across layers.

---

### 2. Strings at boundaries, Dates only for math

- Trade timestamps (`enteredAt`, `exitedAt`) are stored as **ISO datetime strings**
- Date objects are created **only at the moment of date math**

This avoids:
- Serialization bugs
- Frontend ↔ backend mismatches
- Accidental `.getTime()` calls on strings

---

### 3. Adapters normalize, schemas validate

- The CSV adapter is responsible for:
  - parsing numbers
  - parsing dates
  - normalizing sides (`Long` / `Short`)
- Shared schemas are responsible for:
  - enforcing correct shape
  - validating types
  - protecting downstream analytics

Invalid rows are **skipped with warnings**, not fatal.

---

### 4. Deterministic analytics

All analytics are implemented as pure functions over validated trades:
- No hidden state
- No model inference
- No probabilistic logic

Identical inputs always produce identical outputs.

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `load_trades` | Load and normalize CSV trades |
| `dataset_info` | Dataset metadata and summary |
| `pnl_summary` | PnL analytics and grouped breakdowns |

The same logic powers both MCP tools and HTTP API routes.

---

## Example CSV

Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Size,Type,Fees,PnL
1,NQ,2026-01-09T14:30:00Z,2026-01-09T14:42:00Z,16980.00,17005.50,1,Long,2.50,23.00
2,ES,2026-01-10T15:05:00Z,2026-01-10T15:25:00Z,4818.00,4826.50,1,Long,2.25,6.25

---

## Running the Project

### Install dependencies
```bash
npm install
Start the MCP server
bash
Copy code
npm run dev
Start the Next.js app
bash
Copy code
cd web
npm run dev
Then open:


http://localhost:3000/import
Limitations
Dataset storage is in-memory only (resets on server restart)

Intended for development and experimentation

Persistence can be added later (database or file-backed store)