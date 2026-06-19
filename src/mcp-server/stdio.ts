import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { SourceConfig, TokenStorage } from '../config/validation.js';
import { createOMTMcpServer } from './server.js';

/**
 * Start the oh-my-triage MCP server over stdio.
 *
 * Stdio is the default local transport for MCP clients that spawn oh-my-triage
 * as a child process and exchange JSON-RPC messages over standard streams.
 */
export async function startOMTStdioServer(params?: {
  dbPath?: string;
  configuredSources?: SourceConfig[];
  tokenStorage?: TokenStorage;
  demoMode?: boolean;
}): Promise<void> {
  const server = createOMTMcpServer(params);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
