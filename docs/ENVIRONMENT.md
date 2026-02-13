# Environment Variables

All environment variables for the Savoir project, organized by category.

## Core

| Variable | Required | Description |
|----------|----------|-------------|
| `NUXT_PUBLIC_SITE_URL` | Yes | Public URL of your Savoir instance |
| `NUXT_ADMIN_USERS` | Yes | Comma-separated list of admin emails or GitHub usernames |

## Authentication

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | Secret used to sign sessions and tokens |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth app client secret |
| `NUXT_SESSION_PASSWORD` | No | Session encryption password |

## AI

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway API key (used by `@ai-sdk/gateway`) |

## Sandbox & Sync

| Variable | Required | Description |
|----------|----------|-------------|
| `NUXT_GITHUB_TOKEN` | Yes | GitHub token for cloning repos and accessing the snapshot repository |
| `NUXT_GITHUB_SNAPSHOT_REPO` | Yes | Snapshot repository in `owner/repo` format |
| `NUXT_GITHUB_SNAPSHOT_BRANCH` | No | Snapshot branch (default: `main`) |

## GitHub Bot

| Variable | Required | Description |
|----------|----------|-------------|
| `NUXT_PUBLIC_GITHUB_BOT_TRIGGER` | Yes* | Bot mention trigger (e.g. `@nuxt-agent`). Required if using the GitHub bot. |
| `NUXT_GITHUB_APP_ID` | Yes* | GitHub App ID |
| `NUXT_GITHUB_APP_PRIVATE_KEY` | Yes* | GitHub App private key (PEM format, can be base64-encoded) |
| `NUXT_GITHUB_WEBHOOK_SECRET` | Yes* | Webhook secret set when creating the GitHub App |

\* Required only if enabling the GitHub bot integration.

## Discord Bot

| Variable | Required | Description |
|----------|----------|-------------|
| `NUXT_DISCORD_BOT_TOKEN` | Yes* | Discord bot token |
| `NUXT_DISCORD_PUBLIC_KEY` | Yes* | Discord application public key |
| `NUXT_DISCORD_APPLICATION_ID` | Yes* | Discord application ID |
| `NUXT_DISCORD_MENTION_ROLE_IDS` | No | Comma-separated role IDs that can trigger the bot |

\* Required only if enabling the Discord bot integration.

## YouTube

| Variable | Required | Description |
|----------|----------|-------------|
| `NUXT_YOUTUBE_API_KEY` | Yes* | YouTube Data API key for fetching video transcripts |

\* Required only if syncing YouTube sources.

## Storage

| Variable | Required | Description |
|----------|----------|-------------|
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob token for file uploads |

## Optional

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | No | Redis URL for bot state persistence. Falls back to in-memory state if not set. |
| `VERCEL_OIDC_TOKEN` | No | Vercel OIDC token (auto-injected in Vercel deployments) |

## SDK (`@savoir/sdk`)

When using the SDK from an external application:

| Variable | Required | Description |
|----------|----------|-------------|
| `SAVOIR_API_URL` | Yes | Base URL of your Savoir API |
| `SAVOIR_API_KEY` | No | API key for authentication (Better Auth API key) |

## Database

Migrations run automatically when the application starts -- no manual `db:migrate` step is needed.

```bash
# Generate new migrations after schema changes
bun run db:generate
```

## Workflows

```bash
# Monitor workflow progress
bun run workflow:web
```
