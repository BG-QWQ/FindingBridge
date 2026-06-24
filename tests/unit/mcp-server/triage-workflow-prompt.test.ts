import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';
import { registerTriageWorkflowPrompt } from '@/mcp-server/prompts/triage-workflow.js';

type PromptResult = { messages: Array<{ content: { type: string; text: string } }> };
type PromptHandler = () => PromptResult;

describe('triage workflow prompt', () => {
  it('defaults unspecified code reviews to the current workspace repository', () => {
    let promptHandler: PromptHandler | undefined;
    const server = {
      registerPrompt: (_name: string, _metadata: unknown, handler: PromptHandler): void => {
        promptHandler = handler;
      },
    } as unknown as McpServer;

    registerTriageWorkflowPrompt(server);
    if (!promptHandler) {
      throw new Error('Expected triage prompt registration.');
    }

    const prompt = promptHandler().messages[0]?.content.text ?? '';

    expect(prompt).toContain('if the user asks for a code review or security review without naming a repository/project');
    expect(prompt).toContain('treat the current workspace repository/project as the intended review target');
    expect(prompt).toContain('Ask the user for confirmation only when no match or multiple plausible matches remain');
  });
});
