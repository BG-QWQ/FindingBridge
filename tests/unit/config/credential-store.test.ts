import keytar from 'keytar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CredentialStore } from '@/config/credential-store.js';

const mockedKeytar = vi.mocked(keytar);
const ORIGINAL_ENV = process.env;

describe('CredentialStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it('uses canonical OMT environment names', () => {
    const store = new CredentialStore();

    expect(store.envName('github-code-scanning')).toBe('OMT_TOKEN_GITHUB_CODE_SCANNING');
    expect(store.legacyEnvName('github-code-scanning')).toBe('FINDINGBRIDGE_TOKEN_GITHUB_CODE_SCANNING');
  });

  it('prefers the canonical environment variable over legacy fallback', async () => {
    const store = new CredentialStore();
    const warn = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    process.env.OMT_TOKEN_GITHUB_CODE_SCANNING = 'canonical-secret';
    process.env.FINDINGBRIDGE_TOKEN_GITHUB_CODE_SCANNING = 'legacy-secret';

    await expect(store.getToken('github-code-scanning', 'env', 'OMT_TOKEN_GITHUB_CODE_SCANNING')).resolves.toBe('canonical-secret');

    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to the legacy environment variable with a redacted deprecation warning', async () => {
    const store = new CredentialStore();
    const warn = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    process.env.FINDINGBRIDGE_TOKEN_GITHUB_CODE_SCANNING = 'legacy-secret';

    await expect(store.getToken('github-code-scanning', 'env', 'OMT_TOKEN_GITHUB_CODE_SCANNING')).resolves.toBe('legacy-secret');

    expect(warn).toHaveBeenCalledTimes(1);
    const warning = String(warn.mock.calls[0]?.[0]);
    expect(warning).toContain('FINDINGBRIDGE_TOKEN_GITHUB_CODE_SCANNING is deprecated');
    expect(warning).toContain('OMT_TOKEN_GITHUB_CODE_SCANNING');
    expect(warning).not.toContain('legacy-secret');
  });

  it('reads the canonical keychain service before legacy migration', async () => {
    const store = new CredentialStore();
    const warn = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    mockedKeytar.getPassword.mockResolvedValueOnce('canonical-secret');

    await expect(store.getToken('github-code-scanning', 'keychain')).resolves.toBe('canonical-secret');

    expect(mockedKeytar.getPassword).toHaveBeenCalledTimes(1);
    expect(mockedKeytar.getPassword).toHaveBeenCalledWith('oh-my-triage', 'github-code-scanning');
    expect(mockedKeytar.setPassword).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('migrates legacy keychain credentials without exposing token values', async () => {
    const store = new CredentialStore();
    const warn = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    mockedKeytar.getPassword.mockResolvedValueOnce(null).mockResolvedValueOnce('legacy-secret');

    await expect(store.getToken('github-code-scanning', 'keychain')).resolves.toBe('legacy-secret');

    expect(mockedKeytar.getPassword).toHaveBeenNthCalledWith(1, 'oh-my-triage', 'github-code-scanning');
    expect(mockedKeytar.getPassword).toHaveBeenNthCalledWith(2, 'FindingBridge', 'github-code-scanning');
    expect(mockedKeytar.setPassword).toHaveBeenCalledTimes(1);
    expect(mockedKeytar.setPassword).toHaveBeenCalledWith('oh-my-triage', 'github-code-scanning', 'legacy-secret');
    const warning = String(warn.mock.calls[0]?.[0]);
    expect(warning).toContain("Migrated credential 'github-code-scanning'");
    expect(warning).toContain('FindingBridge keychain service');
    expect(warning).toContain('oh-my-triage');
    expect(warning).not.toContain('legacy-secret');
  });

  it('writes and deletes only the canonical keychain service', async () => {
    const store = new CredentialStore();

    await expect(store.setToken('github-code-scanning', 'canonical-secret', 'keychain')).resolves.toEqual({
      storage: 'keychain',
      tokenRef: 'github-code-scanning',
    });
    await store.deleteToken('github-code-scanning', 'keychain');

    expect(mockedKeytar.setPassword).toHaveBeenCalledWith('oh-my-triage', 'github-code-scanning', 'canonical-secret');
    expect(mockedKeytar.deletePassword).toHaveBeenCalledWith('oh-my-triage', 'github-code-scanning');
    expect(mockedKeytar.setPassword).not.toHaveBeenCalledWith('FindingBridge', expect.any(String), expect.any(String));
    expect(mockedKeytar.deletePassword).not.toHaveBeenCalledWith('FindingBridge', expect.any(String));
  });

  it('returns canonical env setup instructions', async () => {
    const store = new CredentialStore();

    await expect(store.setToken('github-code-scanning', 'unused-secret', 'env')).resolves.toEqual({
      storage: 'env',
      tokenRef: 'OMT_TOKEN_GITHUB_CODE_SCANNING',
      warning: 'Set this environment variable before running oh-my-triage.',
    });
  });
});
