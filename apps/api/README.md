# Savoir API

Self-hostable API server for managing content synchronization.

## Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub token for API access |
| `GITHUB_SNAPSHOT_REPO` | Yes | Snapshot repository (owner/repo) |
| `GITHUB_SNAPSHOT_BRANCH` | No | Branch to push to (default: main) |
| `SAVOIR_SECRET_KEY` | No | API key for authentication |

## Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Sync Commands

Content synchronization uses [Vercel Workflow](https://github.com/vercel/workflow) for durable execution with automatic retries.

```bash
# Start the dev server first
pnpm dev

# In another terminal, trigger sync
curl -X POST http://localhost:3000/api/sync

# Monitor workflow execution
pnpm workflow:web
```

## API Endpoints

### GET /api

Health check and API information.

### GET /api/sources

List all configured content sources.

**Response:**
```json
{
  "total": 25,
  "github": {
    "count": 23,
    "sources": [...]
  },
  "youtube": {
    "count": 2,
    "sources": [...]
  }
}
```

### POST /api/sync

Sync all sources.

**Body (optional):**
```json
{
  "reset": false,
  "push": true
}
```

**Response:**
```json
{
  "status": "started",
  "message": "Sync workflow started. Use `pnpm workflow:web` to monitor.",
  "options": { "reset": false, "push": true }
}
```

### POST /api/sync/:source

Sync a specific source.

**Params:**
- `source`: Source ID (e.g., `nuxt`, `nuxt-ui`, `h3`)

**Body (optional):**
```json
{
  "reset": false,
  "push": true
}
```

## Configuration

Sources are configured in `savoir.config.ts` at the project root:

```typescript
import { defineConfig } from '@savoir/config'

export default defineConfig({
  sources: {
    github: [
      { id: 'nuxt', repo: 'nuxt/nuxt', contentPath: 'docs' },
      { id: 'nitro', repo: 'nitrojs/nitro', branch: 'v3' },
    ],
    youtube: [
      { id: 'alex-lichter', channelId: 'UCqFPgMzGbLjd-MX-h3Z5aQA' },
    ],
  },
})
```

See [SOURCES.md](/docs/SOURCES.md) for details on source configuration.
