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

## CLI Commands

Sync content directly from the terminal using Nitro tasks:

```bash
# Sync all sources
pnpm sync

# Sync without pushing to snapshot repo
pnpm sync --payload '{"push": false}'

# Sync a specific source
pnpm sync --payload '{"source": "nuxt-ui"}'

# Reset and sync all
pnpm sync --payload '{"reset": true}'

# Combine options
pnpm sync --payload '{"source": "nuxt", "reset": true, "push": false}'
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

### POST /api/sync

Trigger full content synchronization.

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
