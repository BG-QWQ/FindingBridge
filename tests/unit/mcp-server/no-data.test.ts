import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type Database from 'better-sqlite3';
import { closeConnection, createConnection } from '@/database/connection.js';
import { FindingRepository } from '@/database/repositories/finding-repo.js';
import { RuleRepository } from '@/database/repositories/rule-repo.js';
import { listFindingsTool } from '@/mcp-server/tools/list-findings.js';
import { summaryTool } from '@/mcp-server/tools/summary.js';
import type { FindingBridgeToolEnvelope } from '@/mcp-server/tool-result.js';
import type { FindingBridgeMcpContext } from '@/mcp-server/context.js';

function unwrapData(result: CallToolResult): Record<string, unknown> {
  const envelope = result.structuredContent as FindingBridgeToolEnvelope<Record<string, unknown>> | undefined;
  expect(envelope?.success).toBe(true);
  if (!envelope || !envelope.success) {
    throw new Error('Expected successful FindingBridge tool envelope.');
  }
  return envelope.data;
}

describe('MCP no-data responses', () => {
  let db: Database.Database;
  let context: FindingBridgeMcpContext;

  beforeEach(() => {
    db = createConnection(':memory:');
    context = {
      db,
      findings: new FindingRepository(db),
      rules: new RuleRepository(db),
    };
  });

  afterEach(() => {
    closeConnection(db);
  });

  it('makes empty list_findings responses explicit and non-inferential', () => {
    const data = unwrapData(
      listFindingsTool(context, {
        limit: 20,
        offset: 0,
        sort_by: 'priority_score',
      })
    );

    expect(data.findings).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.has_findings).toBe(false);
    expect(data.data_availability).toMatchObject({
      has_findings: false,
      no_data_reason: 'No findings are available in the configured FindingBridge database for this request.',
      agent_instruction: expect.stringContaining('Do not invent vulnerabilities'),
    });
    expect(data.scope).toMatchObject({
      type: 'global_database',
      project_scope_supported: false,
      current_project_matched: false,
      agent_instruction: expect.stringContaining('Do not claim these findings apply to the current project'),
    });
  });

  it('makes empty summary responses explicit and non-inferential', () => {
    const data = unwrapData(summaryTool(context));

    expect(data.severity_counts).toEqual({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });
    expect(data.total).toBe(0);
    expect(data.has_findings).toBe(false);
    expect(data.data_availability).toMatchObject({
      has_findings: false,
      agent_instruction: expect.stringContaining('Do not invent vulnerabilities'),
    });
    expect(data.scope).toMatchObject({
      type: 'global_database',
      project_scope_supported: false,
      current_project_matched: false,
    });
  });
});
