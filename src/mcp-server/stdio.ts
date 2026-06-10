import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { SourceConfig } from '../config/validation.js';
import { createFindingBridgeMcpServer } from './server.js';

/**
 * Start the FindingBridge MCP server over stdio.
 *
 * Stdio is the default local transport for MCP clients that spawn FindingBridge
 * as a child process and exchange JSON-RPC messages over standard streams.
 */
export async function startFindingBridgeStdioServer(params?: {
  dbPath?: string;
  configuredSources?: SourceConfig[];
  demoMode?: boolean;
}): Promise<void> {
  const server = createFindingBridgeMcpServer(params);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
