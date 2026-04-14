import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { registerTools } from './mcp/registerTools.js';

const server = new McpServer({
  name: 'trade-journal-mcp',
  version: '0.1.0',
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
