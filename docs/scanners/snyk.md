# Snyk

## Setup

### 1. Create Snyk Token

1. Go to https://app.snyk.io/account
2. Generate a personal access token or service account token with REST API access
3. Copy the token

Snyk public REST API access is controlled by both token permissions and the Snyk organization plan or contract. A token can be valid for login, organization listing, and the Snyk Web UI while the public REST `projects` or `issues` APIs still return `403 Forbidden` because API access is not included in the plan.

### 2. Configure oh-my-triage

```bash
oh-my-triage setup
# Select "Snyk", paste token, and enter the organization ID
```

Or set directly:

```bash
oh-my-triage config set-token snyk
```

## Token Validation

oh-my-triage validates your token by:

1. Calling `GET /rest/orgs?version=2024-10-15`
2. Confirming the token can list organizations
3. Optionally testing issue access when an organization ID is configured

Passing organization validation does not prove full Snyk sync will work. Full sync requires public REST access to project and issue endpoints, which Snyk may restrict by plan or contract even for organization administrators.

## Plan and Testing Limitations

The Snyk adapter is implemented against Snyk's public REST API. In environments without Snyk API entitlement, maintainers can verify only the parts that Snyk exposes without that entitlement, such as authentication, organization discovery, and sometimes target visibility. They cannot complete live testing of project and issue synchronization unless a Snyk organization with public REST API access is available.

If you see `Snyk REST API access is forbidden` while the same account can browse projects in the Snyk Web UI, the likely cause is plan or contract entitlement rather than an invalid token. The Web UI may use internal endpoints that remain available while public REST `projects` and `issues` endpoints are blocked.

## Sync Behavior

Snyk sources are not auto-inferred from the current GitHub repository. Save the organization ID in the source options or pass it per sync call.

```json
{
  "id": "snyk",
  "type": "snyk",
  "options": {
    "organization": "your-org-id"
  }
}
```

## Data Retrieved

- Snyk issues (vulnerabilities and license issues)
- Issue titles, keys, statuses, and severities
- Package PURL relationships when available

## Severity Mapping

| Snyk | Unified Severity |
|------|-----------------|
| critical | critical |
| high | high |
| medium | medium |
| low | low |

When multiple severity sources are present, oh-my-triage selects the highest severity.

## API Behavior

- Base URL: `https://api.snyk.io/rest`
- Authentication: `Authorization: token <token>` (note: not `Bearer`)
- API version: `2024-10-15`
- Pagination: cursor-based via `links.next` and `starting_after`
- Page size: 100 issues per request

## Regional Endpoints

If your Snyk organization uses a regional endpoint, set `api_url` in the source configuration:

- US-02: `https://api.us.snyk.io`
- EU-01: `https://api.eu.snyk.io`
- AU-01: `https://api.au.snyk.io`

## Troubleshooting

| Error | Solution |
|-------|----------|
| Invalid token | Generate a new Snyk token with REST API access |
| Missing organization ID | Save `options.organization` or pass `org_id` |
| No organizations found | Verify the token is active and belongs to the expected Snyk group |
| `Snyk REST API access is forbidden` | Confirm the Snyk organization has public REST API access enabled in its plan or contract, then use a token that can read projects and issues |
| 429 rate limit | Reduce sync frequency or use a dedicated service account |

## Privacy

- No source code is uploaded
- Only issue metadata is retrieved
- Token is stored in the system keychain
