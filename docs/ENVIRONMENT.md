# Environment Variables

> Back to [README](../README.md) | See also: [Architecture](./ARCHITECTURE.md), [Customization](./CUSTOMIZATION.md)

Copy the example file and fill in the values:

```bash
cp apps/app/.env.example apps/app/.env
```

## Quick Start (minimum required)

| Variable | How to get it |
|----------|---------------|
| `BETTER_AUTH_SECRET` | Run `openssl rand -hex 32` in your terminal |
| `GITHUB_CLIENT_ID` | From your [GitHub App settings](https://github.com/settings/apps) → Client ID |
| `GITHUB_CLIENT_SECRET` | From your [GitHub App settings](https://github.com/settings/apps) → Generate a client secret |

These three variables are all you need to deploy. You also need `OPENROUTER_API_KEY` (see [AI](#ai) below). Everything else is optional.

## Authentication

### `BETTER_AUTH_SECRET` (required)

Random secret used by [Better Auth](https://www.better-auth.com/docs/installation#set-environment-variables) to sign sessions and tokens. Generate one with:

```bash
openssl rand -hex 32
```

### `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (required)

GitHub OAuth credentials for user login. You need a **GitHub App** (not an OAuth App) — the same app can also power the GitHub bot later.

1. Go to [**GitHub Settings → Developer settings → GitHub Apps → New GitHub App**](https://github.com/settings/apps/new)
2. Fill in:
   - **App name**: your bot name (e.g. `my-agent`)
   - **Homepage URL**: your instance URL (or `http://localhost:3000` for dev)
   - **Callback URL**: `<your-url>/api/auth/callback/github`
3. Under **Account permissions**, set **Email addresses** → Read-only
4. Create the app, then from the app settings page:
   - Copy the **Client ID** → `GITHUB_CLIENT_ID`
   - Click **Generate a new client secret** → `GITHUB_CLIENT_SECRET`

> See the [Getting Started guide](https://github.com/vercel-labs/knowledge-agent-template/blob/main/apps/app/app/content/docs/getting-started.md#github-app-setup) for the full GitHub App setup with bot permissions.

### `BETTER_AUTH_URL` (required in production for OAuth)

Root URL of your app (e.g. `https://your-domain.com`). Better Auth uses this to build OAuth callback URLs. **Set this in production** or you will get `redirect_uri_mismatch` from Google (and similar issues with GitHub). Use the exact URL users see — no trailing slash. For local dev it can be unset (localhost is used by default).

### `NUXT_SESSION_PASSWORD` (optional)

Session encryption password. Auto-generated if not set.

### Google (optional)

Google OAuth credentials for "Login with Google". You can use a [Firebase](https://console.firebase.google.com/) project (Firebase projects are Google Cloud projects) or create credentials directly in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

1. **Firebase (optional):** In [Firebase Console](https://console.firebase.google.com/) → your project → **Build → Authentication → Sign-in method** → enable **Google**. This does not give you a client secret; create the OAuth client in Google Cloud (same project) as below.
2. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), select the same project as your Firebase project (or create a project).
3. Configure the **OAuth consent screen** if prompted (User type, App name, support email, Authorized domains for production).
4. **Create credentials → OAuth client ID** → Application type: **Web application**.
5. Under **Authorized redirect URIs** add (must match exactly; use the same value as `BETTER_AUTH_URL` + path):
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://<your-domain>/api/auth/callback/google` (production — must equal `BETTER_AUTH_URL` + `/api/auth/callback/google`)
6. Copy **Client ID** → `GOOGLE_CLIENT_ID` and **Client secret** → `GOOGLE_CLIENT_SECRET` in `.env`.

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Web client secret from the same client |

## AI

### `OPENROUTER_API_KEY` (required)

OpenRouter API key used for chat, title generation, bots, and OCR. Read from the environment (e.g. from your `.env` file).

1. Go to [OpenRouter Dashboard](https://openrouter.ai/keys)
2. Create or copy your API key
3. Copy the key → `OPENROUTER_API_KEY` in your `.env`

For Nuxt runtime config you can also set `NUXT_OPENROUTER_API_KEY`; the app falls back to `process.env.OPENROUTER_API_KEY`.

For a list of models suitable for this product (free and paid), see [OpenRouter Models](./OPENROUTER-MODELS.md).

### Knowledge conflict detection (optional)

The **Knowledge conflicts** workflow runs detection in-process (no HTTP callback). **Run Detection** on the Admin → Knowledge Conflicts page starts the workflow; the step handler in the app runs `detectKnowledgeConflicts` directly, so no `CONFLICT_DETECTION_APP_URL` or internal secret is required for the workflow itself.

The internal endpoints `/api/conflicts/execute` and `/api/conflicts/mark-failed` still exist for direct or external callers. If you call them (e.g. from another service), set a shared secret and send it in the `x-conflict-internal-secret` header:

| Variable | Description |
|----------|-------------|
| `NUXT_CONFLICT_DETECTION_INTERNAL_SECRET` or `CONFLICT_DETECTION_INTERNAL_SECRET` | Optional. Any non-empty string for securing direct calls to `/api/conflicts/execute` and `/api/conflicts/mark-failed`. Not required when using the Admin UI workflow. |

## Sandbox & Sync

These control how the app syncs knowledge sources into the sandbox. All are optional — you can configure them later from the admin UI.

| Variable | Default | Description |
|----------|---------|-------------|
| `NUXT_GITHUB_SNAPSHOT_REPO` | — | Snapshot repository in `owner/repo` format. Configurable from admin UI. |
| `NUXT_GITHUB_SNAPSHOT_BRANCH` | `main` | Branch to use for snapshots |
| `NUXT_GITHUB_TOKEN` | — | Fallback PAT for git operations. Only needed if GitHub App tokens are unavailable. |

## GitHub Bot (optional)

To enable the GitHub bot that responds to mentions in issues, add these from your [GitHub App settings page](https://github.com/settings/apps):

| Variable | Where to find it |
|----------|-----------------|
| `NUXT_PUBLIC_GITHUB_APP_NAME` | Your GitHub App name (e.g. `my-agent`) |
| `NUXT_PUBLIC_GITHUB_BOT_TRIGGER` | Override mention trigger (defaults to app name) |
| `NUXT_GITHUB_APP_ID` | App settings → **App ID** |
| `NUXT_GITHUB_APP_PRIVATE_KEY` | App settings → **Generate a private key** (PEM format, can be base64-encoded) |
| `NUXT_GITHUB_WEBHOOK_SECRET` | The secret you set when creating the app's webhook |

The webhook URL should be `<your-url>/api/webhooks/github`. Subscribe to **Issues** and **Issue comments** events.

### Required GitHub App permissions for the bot

| Permission | Access | Why |
|------------|--------|-----|
| Issues | Read & Write | Read issues and post replies |
| Metadata | Read-only | Required by GitHub for all apps |
| Contents | Read & Write | Push synced content (if using snapshot management) |
| Administration | Read & Write | Auto-create snapshot repos (optional, needs org approval) |

## Discord Bot (optional)

To add a Discord bot, create an app in the [Discord Developer Portal](https://discord.com/developers/applications):

| Variable | Where to find it |
|----------|-----------------|
| `NUXT_DISCORD_BOT_TOKEN` | Bot → **Reset Token** → copy |
| `NUXT_DISCORD_PUBLIC_KEY` | General Information → **Public Key** |
| `NUXT_DISCORD_APPLICATION_ID` | General Information → **Application ID** |
| `NUXT_DISCORD_MENTION_ROLE_IDS` | Comma-separated role IDs that can trigger the bot (optional) |

Set the interactions endpoint URL to `<your-url>/api/webhooks/discord`.

## YouTube (optional)

### `NUXT_YOUTUBE_API_KEY`

Required only if syncing YouTube sources (video transcripts).

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project (or select an existing one)
3. Enable the [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the key → `NUXT_YOUTUBE_API_KEY`

## Storage (optional)

### `BLOB_READ_WRITE_TOKEN`

[Vercel Blob](https://vercel.com/docs/storage/vercel-blob) token for file uploads. Auto-injected in Vercel deployments.

To get one manually: [Vercel Dashboard](https://vercel.com) → your project → **Storage** → **Blob** → **Connect** → copy the token.

## State (optional)

### `REDIS_URL`

Redis connection URL for bot state persistence (tracks which threads the bot is subscribed to). Falls back to in-memory state if not set — fine for development, but state is lost on restart.

Any Redis-compatible provider works: [Upstash](https://upstash.com), [Redis Cloud](https://redis.io/cloud), etc.

### `VERCEL_OIDC_TOKEN`

Auto-injected in Vercel deployments. No action needed.

## SDK (`@savoir/sdk`)

When using the SDK from an external application:

| Variable | Description |
|----------|-------------|
| `SAVOIR_API_URL` | Base URL of your deployed instance (e.g. `https://your-app.vercel.app`) |
| `SAVOIR_API_KEY` | API key generated from the admin panel at `/admin/api-keys` |

## Database

Migrations run automatically when the application starts — no manual step needed.

### `DATABASE_URL` (optional but recommended for local dev)

Nuxt Hub uses **PGLite** (embedded Postgres in WASM) when no database URL is set. On **Bun**, PGLite can fail with `Aborted(). Build with -sASSERTIONS for more info.` Using a real PostgreSQL avoids that.

| Variable        | Description |
|----------------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/dbname`). Nuxt Hub also checks `POSTGRES_URL` and `POSTGRESQL_URL` first. |

**Options:**

- **Local Postgres**: Install Postgres (e.g. [Postgres.app](https://postgresapp.com/) on macOS, or Docker) and set `DATABASE_URL`.
- **Neon / other hosted Postgres**: Use a free tier URL and set `DATABASE_URL` in `.env`.

If you leave it unset, the app uses PGLite; if you see the Aborted() error when running `bun run dev`, set `DATABASE_URL` to a real Postgres instance.

```bash
# Generate new migrations after schema changes
bun run db:generate
```
