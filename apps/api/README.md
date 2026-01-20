# Savoir API

Self-hostable API server for managing content synchronization and sandbox operations.

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

Content synchronization uses [Vercel Workflow DevKit](https://useworkflow.dev/) for durable execution with automatic retries.

```bash
# Start the dev server first
pnpm dev

# In another terminal, trigger async workflow sync
pnpm sync:docs

# Monitor workflow execution
pnpm workflow:web
```

**Via curl with options:**

```bash
# Async workflow (recommended)
curl -X POST http://localhost:3000/api/sync/workflow

# With options
curl -X POST http://localhost:3000/api/sync/workflow \
  -H "Content-Type: application/json" \
  -d '{"source": "nuxt-ui", "push": false}'

# Sync specific source (legacy, synchronous)
curl -X POST http://localhost:3000/api/sync/nuxt-ui
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `source` | string | - | Sync only this source ID |
| `reset` | boolean | false | Clear content before sync |
| `push` | boolean | true | Push to snapshot repo after sync |

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

### POST /api/sync/workflow

Trigger async sync workflow (recommended). Uses Workflow DevKit for automatic retries.

**Body (optional):**
```json
{
  "reset": false,
  "push": true,
  "source": "nuxt-ui"
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

### POST /api/sync

Trigger full content synchronization (synchronous).

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
  "success": true,
  "summary": {
    "total": 25,
    "success": 25,
    "failed": 0,
    "files": 1234
  },
  "push": {
    "success": true,
    "commitSha": "abc123...",
    "filesChanged": 1234
  },
  "results": [...]
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

## Adding Sources

Edit `utils/sources/sources.ts` to add new sources:

```typescript
{
  id: 'my-project',
  label: 'My Project',
  type: 'github',
  repo: 'org/repo',
  branch: 'main',
  contentPath: 'docs',
  outputPath: 'my-project',
}
```
