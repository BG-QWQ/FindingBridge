import { describe, expect, it } from 'vitest';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  ListFindingsInputSchema,
  GetFindingDetailInputSchema,
  ExplainFindingInputSchema,
  SuggestFixInputSchema,
  PrioritizeFindingsInputSchema,
  DeduplicateFindingsInputSchema,
  GenerateReportInputSchema,
  SyncSourcesInputSchema,
  ListSourceProjectsInputSchema,
} from '@/mcp-server/tool-schemas.js';

/**
 * Recursively collect every `$ref` value in a JSON Schema object.
 */
function collectRefs(value: unknown, refs: string[] = []): string[] {
  if (typeof value !== 'object' || value === null) {
    return refs;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectRefs(item, refs);
    }
    return refs;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (key === '$ref' && typeof nested === 'string') {
      refs.push(nested);
    } else {
      collectRefs(nested, refs);
    }
  }

  return refs;
}

describe('MCP tool input JSON Schemas', () => {
  const schemas = [
    { name: 'ListFindingsInputSchema', schema: ListFindingsInputSchema },
    { name: 'GetFindingDetailInputSchema', schema: GetFindingDetailInputSchema },
    { name: 'ExplainFindingInputSchema', schema: ExplainFindingInputSchema },
    { name: 'SuggestFixInputSchema', schema: SuggestFixInputSchema },
    { name: 'PrioritizeFindingsInputSchema', schema: PrioritizeFindingsInputSchema },
    { name: 'DeduplicateFindingsInputSchema', schema: DeduplicateFindingsInputSchema },
    { name: 'GenerateReportInputSchema', schema: GenerateReportInputSchema },
    { name: 'SyncSourcesInputSchema', schema: SyncSourcesInputSchema },
    { name: 'ListSourceProjectsInputSchema', schema: ListSourceProjectsInputSchema },
  ];

  it.each(schemas)('emits no $ref references for $name', ({ schema }) => {
    const jsonSchema = zodToJsonSchema(schema, {
      strictUnions: true,
      pipeStrategy: 'input',
    });

    const refs = collectRefs(jsonSchema);
    expect(refs).toEqual([]);
  });
});
