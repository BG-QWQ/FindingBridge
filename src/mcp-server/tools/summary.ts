import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { OMTMcpContext } from '../context.js';
import { toolException, toolSuccess } from '../tool-result.js';
import { findingDataAvailability, findingProvenanceWarnings, globalFindingScope } from './shared.js';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;

/**
 * Summarize findings without implying current-project coverage.
 *
 * oh-my-triage currently stores a local normalized database rather than a
 * per-repository tenant model, so the response includes explicit scope metadata
 * telling agents not to infer findings for the repository they are reviewing.
 */
export function summaryTool(context: OMTMcpContext): CallToolResult {
  try {
    const severityCounts = context.findings.countBySeverity();
    const total = SEVERITIES.reduce((sum, severity) => sum + (severityCounts[severity] ?? 0), 0);

    return toolSuccess({
      severity_counts: severityCounts,
      total,
      has_findings: total > 0,
      data_availability: findingDataAvailability(total),
      scope: globalFindingScope(),
      provenance_warnings: findingProvenanceWarnings(context),
    });
  } catch (error: unknown) {
    return toolException(error, [
      'Verify the oh-my-triage database path is correct.',
      'Run an ingest command before summarizing findings if the database is empty.',
    ]);
  }
}
