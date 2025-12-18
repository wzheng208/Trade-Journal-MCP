# Trade Journal MCP Server

This project is a Model Context Protocol (MCP) server that allows an AI to safely load and analyze real trading data from a CSV trade journal using deterministic tools.

## Why MCP
Trading data is highly sensitive to incorrect calculations. Instead of asking a language model to reason over raw CSV text, this MCP server exposes explicit tools for ingestion and analytics, ensuring correctness and reproducibility.

## Features
- Load broker-exported CSV trade logs
- Normalize trades into a clean domain model
- Compute dataset metadata and time ranges
- Generate PnL analytics including win rate, expectancy, and profit factor
- Group analytics by symbol, side, or trade day

## Architecture
