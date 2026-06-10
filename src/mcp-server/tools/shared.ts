import type { Finding } from '../../core/models/finding.js';
import { redactCodeSnippet, redactSecrets } from '../../utils/redaction.js';
import type { FindingBridgeMcpContext } from '../context.js';

const MAX_SCOPE_LIMIT = 1000;

/**
 * Represent a minimal redacted finding for MCP responses.
 *
 * Summaries intentionally omit raw scanner payloads and full code context so
 * list-like tools stay compact and privacy-preserving.
 */
export interface FindingSummary {
  id: string;
  title: string;
  severity: Finding['severity'];
  status: Finding['status'];
  tool: string;
  rule_id: string;
  file_path: string;
  start_line: number;
  cwe_id?: string;
  priority_score: number;
  is_duplicate: boolean;
  duplicate_group_id?: string;
  last_seen_at: string;
}

/** Explain the database scope represented by a read-only MCP response. */
export interface FindingBridgeDataScope {
  type: 'global_database';
  project_scope_supported: false;
  current_project_matched: false;
  message: string;
  agent_instruction: string;
}

/** Describe whether a response contains usable findings for the requested scope. */
export interface FindingBridgeDataAvailability {
  has_findings: boolean;
  no_data_reason: string | null;
  agent_instruction: string;
}

/** Build scope metadata that prevents clients from treating global data as current-project proof. */
export function globalFindingScope(): FindingBridgeDataScope {
  return {
    type: 'global_database',
    project_scope_supported: false,
    current_project_matched: false,
    message:
      'FindingBridge is returning data from its configured local findings database. It has not verified that this data matches the current repository under review.',
    agent_instruction:
      'Do not claim these findings apply to the current project unless the user confirms this FindingBridge database was populated for that project.',
  };
}

/** Build explicit data-availability metadata for list and summary responses. */
export function findingDataAvailability(totalFindings: number): FindingBridgeDataAvailability {
  if (totalFindings > 0) {
    return {
      has_findings: true,
      no_data_reason: null,
      agent_instruction:
        'Report only the findings returned by FindingBridge. Do not add vulnerabilities that are not present in this response.',
    };
  }

  return {
    has_findings: false,
    no_data_reason: 'No findings are available in the configured FindingBridge database for this request.',
    agent_instruction:
      'Report that FindingBridge has no findings for this scope. Do not invent vulnerabilities, file paths, severities, or remediation steps.',
  };
}

/**
 * Convert a finding to a redacted response summary.
 *
 * Scanner titles and paths may contain user-controlled values, so string fields
 * are redacted even when they are not expected to hold secrets.
 */
export function summarizeFinding(finding: Finding): FindingSummary {
  return {
    id: finding.id,
    title: redactSecrets(finding.title),
    severity: finding.severity,
    status: finding.status,
    tool: redactSecrets(finding.source.tool),
    rule_id: redactSecrets(finding.source.rule_id),
    file_path: redactSecrets(finding.location.file_path),
    start_line: finding.location.start_line,
    cwe_id: finding.cwe_id,
    priority_score: finding.priority_score,
    is_duplicate: finding.is_duplicate,
    duplicate_group_id: finding.duplicate_group_id,
    last_seen_at: finding.last_seen_at,
  };
}

/**
 * Return a finding or undefined without throwing.
 *
 * Tool handlers use this to keep not-found responses structured and actionable
 * instead of surfacing repository implementation details.
 */
export function getFinding(context: FindingBridgeMcpContext, findingId: string): Finding | undefined {
  return context.findings.getById(findingId);
}

/**
 * Redact and cap a finding code snippet.
 *
 * The max line count is constrained before calling the shared redaction helper
 * to enforce the MCP privacy rule that responses include only minimal context.
 */
export function safeCodeSnippet(finding: Finding, contextLines: number): string | undefined {
  if (!finding.location.code_snippet) {
    return undefined;
  }

  return redactCodeSnippet(finding.location.code_snippet, Math.min(contextLines, 20));
}

/**
 * List findings for a report or deduplication scope.
 *
 * When explicit finding IDs are provided they take precedence over broader
 * filters because callers are asking for an exact working set.
 */
export function listFindingsForScope(
  context: FindingBridgeMcpContext,
  scope: {
    finding_ids?: string[];
    severity?: Finding['severity'][];
    tool?: string[];
    status?: Finding['status'][];
    file_path?: string;
  }
): Finding[] {
  if (scope.finding_ids?.length) {
    return scope.finding_ids
      .map((findingId) => context.findings.getById(findingId))
      .filter((finding): finding is Finding => finding !== undefined);
  }

  return context.findings.list({
    severity: scope.severity,
    tool: scope.tool,
    status: scope.status,
    file_path: scope.file_path,
    limit: MAX_SCOPE_LIMIT,
    offset: 0,
    sort_by: 'priority_score',
  }).findings;
}

/**
 * Build a redacted location string for human-readable explanation text.
 *
 * Keeping this formatting centralized prevents subtle differences between MCP
 * tools that could confuse clients comparing outputs.
 */
export function formatFindingLocation(finding: Finding): string {
  return `${redactSecrets(finding.location.file_path)}:${finding.location.start_line}`;
}
