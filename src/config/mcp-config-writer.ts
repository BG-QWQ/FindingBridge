import { copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { FindingBridgeError, ErrorCodes } from '../core/errors.js';
import { redactSecrets } from '../utils/redaction.js';
import { DEFAULT_MCP_SERVER_NAME } from './defaults.js';
import type { DetectedMcpClient } from './mcp-client-detector.js';

export type McpConfigWriteResult = {
  client: DetectedMcpClient;
  configPath: string;
  backupPath?: string;
  serverName: string;
};

/** Generate the correct MCP server configuration for the target client format. */
function generateServerConfig(params: {
  client: DetectedMcpClient;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  serverName?: string;
}): Record<string, unknown> {
  const { command, args = ['server'], env = {} } = params;

  switch (params.client.format) {
    case 'mcpServers': {
      // Claude Desktop, Cursor, Claude Code, Windsurf, Cline
      return {
        command,
        args,
        env,
      };
    }
    case 'servers': {
      // VS Code
      return {
        type: 'stdio',
        command,
        args,
        env,
      };
    }
    case 'mcp': {
      // OpenCode
      return {
        type: 'local',
        command: [command, ...args],
        enabled: true,
        environment: env,
      };
    }
    case 'context_servers': {
      // Zed
      return {
        command,
        args,
      };
    }
    default: {
      return {
        command,
        args,
        env,
      };
    }
  }
}

/** Merge FindingBridge into an MCP client config while preserving unrelated servers and settings. */
export async function writeMcpClientConfig(params: {
  client: DetectedMcpClient;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  serverName?: string;
}): Promise<McpConfigWriteResult> {
  const configPath = resolve(params.client.configPath);
  const serverName = params.serverName ?? DEFAULT_MCP_SERVER_NAME;
  const serverConfig = generateServerConfig(params);
  const existing = await readExistingConfig(configPath, params.client.format);
  const backupPath = params.client.exists ? `${configPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}` : undefined;

  let merged: Record<string, unknown>;

  switch (params.client.format) {
    case 'mcpServers': {
      // Claude Desktop, Cursor, Claude Code, Windsurf, Cline
      merged = {
        ...existing,
        mcpServers: {
          ...existing.mcpServers,
          [serverName]: serverConfig,
        },
      };
      break;
    }
    case 'servers': {
      // VS Code
      merged = {
        ...existing,
        servers: {
          ...existing.servers,
          [serverName]: serverConfig,
        },
      };
      break;
    }
    case 'mcp': {
      // OpenCode
      merged = {
        ...existing,
        mcp: {
          ...existing.mcp,
          [serverName]: serverConfig,
        },
      };
      break;
    }
    case 'context_servers': {
      // Zed
      merged = {
        ...existing,
        context_servers: {
          ...existing.context_servers,
          [serverName]: serverConfig,
        },
      };
      break;
    }
    default: {
      merged = {
        ...existing,
        mcpServers: {
          ...existing.mcpServers,
          [serverName]: serverConfig,
        },
      };
    }
  }

  try {
    await mkdir(dirname(configPath), { recursive: true });
    if (backupPath) {
      await copyFile(configPath, backupPath);
    }
    await writeFile(configPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
  } catch (error: unknown) {
    throw new FindingBridgeError({
      code: ErrorCodes.MCP_CONFIG_WRITE_FAILED,
      message: `Unable to update ${params.client.name} MCP configuration.`,
      nextSteps: ['Close the MCP client if it is locking the file, check permissions, then retry setup.'],
      details: { config_path: configPath, error: redactSecrets(String(error)) },
    });
  }

  return { client: params.client, configPath, backupPath, serverName };
}

async function readExistingConfig(configPath: string, format: string): Promise<Record<string, Record<string, unknown>>> {
  try {
    const raw = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    switch (format) {
      case 'mcpServers':
        return { mcpServers: (parsed.mcpServers as Record<string, unknown>) ?? {} };
      case 'servers':
        return { servers: (parsed.servers as Record<string, unknown>) ?? {} };
      case 'mcp':
        return { mcp: (parsed.mcp as Record<string, unknown>) ?? {} };
      case 'context_servers':
        return { context_servers: (parsed.context_servers as Record<string, unknown>) ?? {} };
      default:
        return { mcpServers: (parsed.mcpServers as Record<string, unknown>) ?? {} };
    }
  } catch {
    switch (format) {
      case 'mcpServers':
        return { mcpServers: {} };
      case 'servers':
        return { servers: {} };
      case 'mcp':
        return { mcp: {} };
      case 'context_servers':
        return { context_servers: {} };
      default:
        return { mcpServers: {} };
    }
  }
}