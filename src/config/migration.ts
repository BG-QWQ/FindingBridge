import { constants } from 'node:fs';
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Config } from './validation.js';
import {
  getDefaultConfigDir,
  getDefaultConfigPath,
  getDefaultDatabasePath,
  getDevCredentialPath,
  getLegacyConfigDir,
  getLegacyConfigPath,
  getLegacyDatabasePath,
  getLegacyDevCredentialPath,
} from './defaults.js';

export type LegacyConfigDetection = {
  configDir: boolean;
  configFile: boolean;
  database: boolean;
  devCredential: boolean;
  hasLegacyConfig: boolean;
};

export type MigratedConfigItem = 'configDir' | 'configFile' | 'database' | 'devCredential';

export type ConfigMigrationSummary = {
  detected: LegacyConfigDetection;
  migrated: MigratedConfigItem[];
  skippedExisting: MigratedConfigItem[];
};

/**
 * Detect legacy FindingBridge configuration artifacts without mutating user data.
 *
 * The rename keeps old paths readable for a one-time transition. This helper only
 * performs existence checks so callers can decide whether migration or user-facing
 * messaging is appropriate without creating any canonical directories as a side effect.
 */
export async function detectLegacyConfig(): Promise<LegacyConfigDetection> {
  const [configDir, configFile, database, devCredential] = await Promise.all([
    pathExists(getLegacyConfigDir()),
    pathExists(getLegacyConfigPath()),
    pathExists(getLegacyDatabasePath()),
    pathExists(getLegacyDevCredentialPath()),
  ]);

  return {
    configDir,
    configFile,
    database,
    devCredential,
    hasLegacyConfig: configDir || configFile || database || devCredential,
  };
}

/**
 * Copy legacy FindingBridge configuration artifacts into canonical oh-my-triage paths.
 *
 * Migration is intentionally conservative: each artifact is copied only when the
 * legacy source exists and the canonical destination is absent. Existing canonical
 * files always win, and legacy files are left in place so users can audit or roll
 * back the rename transition manually.
 *
 * @returns A summary of detected legacy artifacts, copied items, and canonical
 * destinations that were already present.
 */
export async function migrateLegacyConfig(): Promise<ConfigMigrationSummary> {
  const detected = await detectLegacyConfig();
  const migrated: MigratedConfigItem[] = [];
  const skippedExisting: MigratedConfigItem[] = [];

  if (detected.configDir && !(await pathExists(getDefaultConfigDir()))) {
    await mkdir(getDefaultConfigDir(), { recursive: true });
    migrated.push('configDir');
  } else if (detected.configDir) {
    skippedExisting.push('configDir');
  }

  await copyArtifactIfNeeded('configFile', getLegacyConfigPath(), getDefaultConfigPath(), migrated, skippedExisting);
  await copyArtifactIfNeeded('database', getLegacyDatabasePath(), getDefaultDatabasePath(), migrated, skippedExisting);
  await copyArtifactIfNeeded('devCredential', getLegacyDevCredentialPath(), getDevCredentialPath(), migrated, skippedExisting);

  if (migrated.includes('configFile')) {
    await rewriteMigratedConfig(getDefaultConfigPath());
  }

  return { detected, migrated, skippedExisting };
}

async function copyArtifactIfNeeded(
  item: MigratedConfigItem,
  sourcePath: string,
  destinationPath: string,
  migrated: MigratedConfigItem[],
  skippedExisting: MigratedConfigItem[]
): Promise<void> {
  if (!(await pathExists(sourcePath))) {
    return;
  }

  if (await pathExists(destinationPath)) {
    skippedExisting.push(item);
    return;
  }

  await mkdir(dirname(destinationPath), { recursive: true });
  await copyFile(sourcePath, destinationPath, constants.COPYFILE_EXCL);
  migrated.push(item);
}

/**
 * Rewrite legacy references inside a freshly migrated configuration file.
 *
 * The legacy database path and legacy token environment variable prefixes are
 * replaced with their canonical oh-my-triage equivalents so the migrated config
 * does not silently point back to FindingBridge paths or env vars.
 */
async function rewriteMigratedConfig(configPath: string): Promise<void> {
  const raw = await readFile(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as Config;

  const legacyDatabasePath = getLegacyDatabasePath();
  const canonicalDatabasePath = getDefaultDatabasePath();
  if (parsed.database_path === legacyDatabasePath) {
    parsed.database_path = canonicalDatabasePath;
  }

  const legacyTokenPrefix = 'FINDINGBRIDGE_TOKEN_';
  const canonicalTokenPrefix = 'OMT_TOKEN_';
  for (const source of parsed.sources ?? []) {
    if (source.token_ref?.startsWith(legacyTokenPrefix)) {
      source.token_ref = source.token_ref.replace(legacyTokenPrefix, canonicalTokenPrefix);
    }
  }

  await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, { encoding: 'utf-8', flag: 'w' });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
