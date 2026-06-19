import type Database from 'better-sqlite3';
import { createConnection } from '../database/connection.js';
import { FindingRepository } from '../database/repositories/finding-repo.js';
import { RuleRepository } from '../database/repositories/rule-repo.js';
import type { SourceConfig, TokenStorage } from '../config/validation.js';

/**
 * Hold shared dependencies for MCP tool handlers.
 *
 * Repositories are created once per server so every tool sees the same SQLite
 * connection and avoids duplicating initialization logic.
 */
export interface OMTMcpContext {
  db: Database.Database;
  findings: FindingRepository;
  rules: RuleRepository;
  runtime: OMTRuntimeMetadata;
}

/** Runtime metadata needed to explain which local data source backs MCP responses. */
export interface OMTRuntimeMetadata {
  databasePath?: string;
  configuredSources: SourceConfig[];
  tokenStorage: TokenStorage;
  demoMode: boolean;
}

/**
 * Configure the server context factory.
 *
 * Tests and embedded callers can provide an existing SQLite connection, while
 * the stdio entrypoint can pass a database path and let the context own setup.
 */
export interface CreateOMTMcpContextOptions {
  db?: Database.Database;
  dbPath?: string;
  configuredSources?: SourceConfig[];
  tokenStorage?: TokenStorage;
  demoMode?: boolean;
}

/**
 * Create repository-backed MCP server context.
 *
 * The default database path supports local development and MCP Inspector smoke
 * tests without additional configuration.
 */
export function createOMTMcpContext(
  options: CreateOMTMcpContextOptions = {}
): OMTMcpContext {
  const db = options.db ?? createConnection(options.dbPath ?? 'oh-my-triage.db');

  return {
    db,
    findings: new FindingRepository(db),
    rules: new RuleRepository(db),
    runtime: {
      databasePath: options.dbPath,
      configuredSources: options.configuredSources ?? [],
      tokenStorage: options.tokenStorage ?? 'keychain',
      demoMode: options.demoMode ?? false,
    },
  };
}
