# Content Sources

Savoir aggregates documentation from multiple sources into a unified, searchable knowledge base.

## Configuration

Sources are defined in `savoir.config.ts` at the project root:

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

Supported formats: `.ts`, `.js`, `.json`, `.yaml`

## Source Types

### GitHub Sources

Fetches Markdown documentation from GitHub repositories.

```typescript
{
  id: string           // Unique identifier
  label?: string       // Display name (defaults to capitalized id)
  repo: string         // GitHub repository (owner/repo)
  branch?: string      // Branch to fetch from (default: 'main')
  contentPath?: string // Path to content directory (default: 'docs')
  outputPath?: string  // Output directory in snapshot (default: id)
  readmeOnly?: boolean // Only fetch README.md (default: false)
  additionalSyncs?: Array<{
    repo: string
    branch?: string
    contentPath?: string
  }>
}
```

**Examples:**

```typescript
// Full documentation tree
{ id: 'nuxt', repo: 'nuxt/nuxt', contentPath: 'docs' }

// Specific branch
{ id: 'nitro', repo: 'nitrojs/nitro', branch: 'v3' }

// README only
{ id: 'ofetch', repo: 'unjs/ofetch', readmeOnly: true }

// Multiple repos merged
{
  id: 'nuxt',
  repo: 'nuxt/nuxt',
  contentPath: 'docs',
  additionalSyncs: [
    { repo: 'nuxt/nuxt.com', contentPath: 'content' },
  ],
}
```

### YouTube Sources

Fetches video transcripts from YouTube channels.

```typescript
{
  id: string           // Unique identifier
  label?: string       // Display name
  channelId: string    // YouTube channel ID
  handle?: string      // YouTube handle (e.g., '@TheAlexLichter')
  maxVideos?: number   // Maximum videos to fetch (default: 50)
}
```

### Custom Sources

For sources that don't fit the standard patterns:

```typescript
{
  id: string
  label?: string
  fetchFn: () => Promise<Array<{ path: string; content: string }>>
}
```

## Syncing

### Via API

```bash
# Sync all sources
curl -X POST http://localhost:3000/api/sync

# Sync specific source
curl -X POST http://localhost:3000/api/sync/nuxt

# With options
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"reset": true, "push": true}'
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `reset` | boolean | false | Clear content before sync |
| `push` | boolean | true | Push to snapshot repo after sync |

## Content Normalization

All content is normalized to Markdown:

| Input | Output |
|-------|--------|
| `.md` | Preserved as-is |
| `.mdx` | Converted to `.md` |
| `.yml`/`.yaml` | Preserved |
| `.json` | Preserved |
| Other | Ignored |

### Excluded Files

- Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, etc.)
- `node_modules/`
- Binary files

## Snapshot Repository

The snapshot repository contains all aggregated content:

```
{GITHUB_SNAPSHOT_REPO}/
├── docs/
│   ├── nuxt/
│   │   ├── getting-started/
│   │   └── composables/
│   ├── nitro/
│   └── ...
└── youtube/
    └── alex-lichter/
```

Configure via environment variable:

```bash
GITHUB_SNAPSHOT_REPO=my-org/content-snapshot
```
