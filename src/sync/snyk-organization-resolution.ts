import type { SourceConfig } from '../config/validation.js';
import { ErrorCodes, OMTError } from '../core/errors.js';

type SnykOrganization = {
  id: string;
  name?: string;
  slug?: string;
};

type SnykOrganizationListClient = {
  listOrganizations(options?: { cursor?: string }): Promise<{
    organizations: SnykOrganization[];
    nextCursor?: string;
  }>;
};

/** Resolve a configured Snyk organization value into the REST organization ID.
 *
 * Setup can store either the display slug/name users recognize or the UUID key
 * returned by project discovery. Snyk REST project and issue endpoints require
 * the UUID, so default current-project sync normalizes the value before it
 * scopes projects or constructs the adapter.
 *
 * @throws OMTError when the configured slug/name is not visible to the token.
 */
export async function resolveSnykOrganizationId(
  configuredOrganization: string,
  client: SnykOrganizationListClient,
  maxPages: number
): Promise<string> {
  if (isUuid(configuredOrganization)) {
    return configuredOrganization;
  }

  let cursor: string | undefined;
  let pagesFetched = 0;
  let hasMore = false;
  const expected = configuredOrganization.toLowerCase();

  do {
    const result = await client.listOrganizations({ cursor });
    const match = result.organizations.find((organization) => snykOrganizationMatches(organization, expected));
    if (match) {
      return match.id;
    }
    cursor = result.nextCursor;
    hasMore = cursor !== undefined;
    pagesFetched += 1;
  } while (hasMore && pagesFetched < maxPages);

  throw new OMTError({
    code: ErrorCodes.CONFIG_INVALID,
    message: `Snyk organization ${configuredOrganization} was not visible to this token.`,
    nextSteps: [
      'Run omt_list_source_projects for the Snyk source to inspect visible organizations.',
      'Save the discovered organization key as options.org_id, or rerun sync with a higher max_pages value if discovery was truncated.',
    ],
    retryable: false,
  });
}

/** Build a source copy that uses the normalized Snyk REST organization ID.
 *
 * The setup/config layer may preserve a human-readable slug. Sync uses this
 * transient source copy so adapter construction and stale-scope keys are based
 * on the same organization UUID that Snyk REST endpoints accept.
 */
export function withSnykOrganizationId(source: SourceConfig, orgId: string): SourceConfig {
  return {
    ...source,
    options: {
      ...source.options,
      organization: orgId,
      org_id: orgId,
    },
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function snykOrganizationMatches(organization: SnykOrganization, expected: string): boolean {
  return [organization.id, organization.name, organization.slug]
    .filter(isNonEmptyString)
    .some((value) => value.toLowerCase() === expected);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
