# Content Sources

Savoir aggregates documentation from multiple sources into a unified, searchable knowledge base.

## Managing Sources

Sources are managed through the **admin interface** at `/admin`. From there you can:

- Add new GitHub repositories or YouTube channels
- Edit existing source configurations
- Delete sources
- Trigger a sync to update the knowledge base

Sources can also be listed programmatically via the SDK:

```typescript
const sources = await savoir.client.getSources()
```

## Database Storage

Sources are stored in SQLite via NuxtHub. The schema:

```typescript
export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['github', 'youtube'] }).notNull(),
  label: text('label').notNull(),
  basePath: text('base_path').default('/docs'),

  // GitHub fields
  repo: text('repo'),
  branch: text('branch'),
  contentPath: text('content_path'),
  outputPath: text('output_path'),
  readmeOnly: integer('readme_only', { mode: 'boolean' }),

  // YouTube fields
  channelId: text('channel_id'),
  handle: text('handle'),
  maxVideos: integer('max_videos').default(50),

  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})
```

## Source Types

### GitHub Sources

Fetches Markdown documentation from GitHub repositories.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `label` | `string` | Display name |
| `repo` | `string` | GitHub repository (`owner/repo`) |
| `branch` | `string?` | Branch to fetch from (default: `main`) |
| `contentPath` | `string?` | Path to content directory (default: `docs`) |
| `outputPath` | `string?` | Output directory in snapshot (default: `id`) |
| `basePath` | `string?` | URL base path for this source (default: `/docs`) |
| `readmeOnly` | `boolean?` | Only fetch README.md (default: `false`) |
| `additionalSyncs` | `array?` | Extra repos to sync into the same source |

### YouTube Sources

Fetches video transcripts from YouTube channels.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `label` | `string` | Display name |
| `channelId` | `string` | YouTube channel ID |
| `handle` | `string?` | YouTube handle (e.g. `@TheAlexLichter`) |
| `maxVideos` | `number?` | Maximum videos to fetch (default: `50`) |

## Syncing

Content syncing is triggered from the **admin interface**. You can also trigger it programmatically via the SDK:

```typescript
// Sync all sources
await savoir.client.sync()

// Sync a specific source
await savoir.client.syncSource('nuxt')
```

### How Sync Works

1. A Vercel Sandbox is created from the latest snapshot
2. All source repositories are cloned/updated
3. Changes are pushed to the snapshot repository
4. A new sandbox snapshot is taken for instant startup

This runs as a durable Vercel Workflow with automatic retries.

### Sync Tracking

The system tracks when sources were last synced:

- `lastSyncAt` timestamp is stored in KV after each successful sync
- `GET /api/sources` returns the `lastSyncAt` value
- The admin interface shows a reminder if the last sync was more than 7 days ago

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

- Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock`, etc.)
- `node_modules/`
- Binary files

## Snapshot Repository

The snapshot repository contains all aggregated content:

```
{NUXT_GITHUB_SNAPSHOT_REPO}/
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
NUXT_GITHUB_SNAPSHOT_REPO=my-org/content-snapshot
```
