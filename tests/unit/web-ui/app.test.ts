import { describe, expect, it } from 'vitest';
import {
  buildInvalidConnectionMessages,
  buildSemgrepSetupSources,
  formatConnectionTestError,
} from '@/web-ui/app.js';

describe('buildInvalidConnectionMessages', () => {
  it('returns an empty array for a valid result', () => {
    expect(buildInvalidConnectionMessages({ valid: true }, 'fallback')).toEqual([]);
  });

  it('returns the reason as an error when the result is invalid', () => {
    expect(buildInvalidConnectionMessages({ valid: false, reason: 'Bad token' }, 'fallback')).toEqual([
      { type: 'error', message: 'Bad token' },
    ]);
  });

  it('falls back to the scanner-specific message when no reason is provided', () => {
    expect(buildInvalidConnectionMessages({ valid: false }, 'fallback message')).toEqual([
      { type: 'error', message: 'fallback message' },
    ]);
  });

  it('appends a warning after the error when a suggestion is provided', () => {
    expect(
      buildInvalidConnectionMessages(
        { valid: false, reason: 'Bad token', suggestion: 'Regenerate your token' },
        'fallback'
      )
    ).toEqual([
      { type: 'error', message: 'Bad token' },
      { type: 'warning', message: 'Regenerate your token' },
    ]);
  });
});

describe('formatConnectionTestError', () => {
  it('includes the error message for Error instances', () => {
    expect(formatConnectionTestError(new Error('network down'))).toBe(
      'Connection test failed: network down'
    );
  });

  it('uses a generic message for non-Error values', () => {
    expect(formatConnectionTestError('something happened')).toBe(
      'Connection test failed: Unknown error'
    );
  });
});

describe('buildSemgrepSetupSources', () => {
  it('builds one Semgrep Code source when SAST only is selected', () => {
    const sources = buildSemgrepSetupSources({
      token: 'token-123',
      deployment: 'acme-deployment',
      issueType: 'sast',
    });

    expect(sources).toEqual([
      {
        id: 'semgrep',
        type: 'semgrep',
        name: 'Semgrep Code',
        enabled: true,
        token: 'token-123',
        options: {
          deployment: 'acme-deployment',
          issue_type: 'sast',
        },
      },
    ]);
  });

  it('builds one Semgrep Supply Chain source when SCA only is selected', () => {
    const sources = buildSemgrepSetupSources({
      token: 'token-123',
      deployment: 'acme-deployment',
      issueType: 'sca',
    });

    expect(sources).toEqual([
      {
        id: 'semgrep',
        type: 'semgrep',
        name: 'Semgrep Supply Chain',
        enabled: true,
        token: 'token-123',
        options: {
          deployment: 'acme-deployment',
          issue_type: 'sca',
        },
      },
    ]);
  });

  it('builds separate Semgrep Code and Supply Chain sources when both are selected', () => {
    const sources = buildSemgrepSetupSources({
      token: 'token-123',
      deployment: 'acme-deployment',
      issueType: 'both',
    });

    expect(sources).toEqual([
      expect.objectContaining({
        id: 'semgrep',
        name: 'Semgrep Code',
        options: {
          deployment: 'acme-deployment',
          issue_type: 'sast',
        },
      }),
      expect.objectContaining({
        id: 'semgrep-supply-chain',
        name: 'Semgrep Supply Chain',
        options: {
          deployment: 'acme-deployment',
          issue_type: 'sca',
        },
      }),
    ]);
  });
});
