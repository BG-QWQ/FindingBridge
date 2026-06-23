# GitHub Code Scanning

## Setup

### 1. Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Choose the token type:
   - **Classic PAT**: click "Generate new token (classic)"
   - **Fine-grained PAT**: click "Generate new token"
3. Select the permissions for your token type:

   | Token type | Required permissions |
   |------------|---------------------|
   | Classic PAT | `repo` (or `public_repo` for public repos only) + `security_events` |
   | Fine-grained PAT | `Metadata` (read) + `Code scanning alerts` (read) |

4. Generate and copy token

### 2. Configure oh-my-triage

```bash
oh-my-triage setup
# Select "GitHub Code Scanning", paste token, test the connection,
# then choose one or more repositories from the discovered list.
```

For headless systems, the CLI fallback prompts for the same repository coordinates:

```bash
oh-my-triage setup --cli
# Enter the GitHub token, repository owner or organization, and repository names.
# Separate multiple repositories with commas; use owner/repo to mix owners.
```

When multiple repositories are selected, oh-my-triage writes one GitHub source per repository and reuses the same token reference for all of them. This keeps sync isolation repository-scoped while avoiding raw token duplication in the configuration file.

By default, synchronization includes configured GitHub sources whose owner and
repository match the current repository's `origin` remote. Other inferable
current-project scanner sources, such as SonarCloud sources with a saved key,
per-call project key, or one unique exact/normalized SonarCloud project match,
may sync in the same run. Ambiguous SonarCloud matches are skipped with guidance
rather than fuzzy auto-synced. Use `oh-my-triage sync --all` or pass
`all_sources: true` to `omt_sync_sources` when you explicitly want to
synchronize every selected repository or source.

Or set directly:

```bash
oh-my-triage config set-token github
```

## Token Permissions

oh-my-triage validates your token has required permissions. The exact permission
names depend on whether you use a classic or fine-grained personal access token:

| Check | Classic PAT scope | Fine-grained PAT permission |
|-------|-------------------|----------------------------|
| Read repos | `repo` or `public_repo` | `Metadata` (read) |
| Read alerts | `security_events` | `Code scanning alerts` (read) |

If permissions are missing, the setup wizard shows:
- Exact missing scopes or permissions
- Link to token settings
- Option to retry or skip

## Data Retrieved

- Code scanning alerts
- Repository metadata needed to populate setup owner/repository selectors
- Alert locations (file, line, column)
- Rule metadata (severity, description, CWE)
- Alert state (open, dismissed, fixed)

## API Behavior

- Pagination: 100 alerts per page
- Multi-repository setup: each selected repository syncs as its own configured source
- Default synchronization: inferred current-project sources only; explicit full sync requires `--all` or `all_sources: true`
- Rate limiting: Follows GitHub API limits
- Error handling: 401/403/404/429 with actionable messages

## Scope Validation

For classic tokens, the adapter checks the `X-OAuth-Scopes` header when available
to verify:
- `repo` or `public_repo` present
- `security_events` present

Fine-grained tokens do not return the `X-OAuth-Scopes` header, so the adapter
relies on the API response itself to detect permission errors.

## Troubleshooting

| Error | Solution |
|-------|----------|
| 401 Unauthorized | Token expired or invalid — regenerate |
| 403 Forbidden | Classic PAT: missing `security_events` scope. Fine-grained PAT: missing `Code scanning alerts` permission — update token |
| 404 Not Found | Repository not found or no access — check repo name |
| 429 Rate Limited | Wait 1 hour or use token with higher rate limit |

## Privacy

- No source code is uploaded
- Only alert metadata is retrieved
- Token is stored in system keychain
