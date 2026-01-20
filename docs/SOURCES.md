# Content Sources

Savoir aggregates documentation from multiple sources into a unified, searchable knowledge base. This document describes how to configure, add, and manage content sources.

## Overview

Sources are external data repositories that Savoir fetches, normalizes to Markdown, and stores in a snapshot repository. The AI agent then searches and reads from this snapshot via a Vercel Sandbox.

```
┌────────────────────────────────────────────────────────────────────┐
│                          Source Types                               │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  GitHub  │  │ YouTube  │  │   MCP    │  │  Custom (future) │   │
│  │   Docs   │  │ Transcripts│ │ Servers │  │  Blogs, APIs     │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │             │             │                  │             │
│       └─────────────┴──────┬──────┴──────────────────┘             │
│                            │                                        │
│                            ▼                                        │
│                   ┌─────────────────┐                              │
│                   │   Normalizer    │                              │
│                   │  (to Markdown)  │                              │
│                   └────────┬────────┘                              │
│                            │                                        │
│                            ▼                                        │
│                   ┌─────────────────┐                              │
│                   │ Snapshot Repo   │                              │
│                   │   (GitHub)      │                              │
│                   └─────────────────┘                              │
└────────────────────────────────────────────────────────────────────┘
```

## Source Configuration

Sources are defined in `apps/api/server/utils/sources.ts`:

```typescript
// apps/api/server/utils/sources.ts
import type { Source } from './types'

export const SOURCES: Source[] = [
  // GitHub documentation
  {
    id: 'nuxt',
    label: 'Nuxt',
    type: 'github',
    repo: 'nuxt/nuxt',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt',
  },

  // README-only sources
  {
    id: 'unhead',
    label: 'Unhead',
    type: 'github',
    repo: 'unjs/unhead',
    branch: 'main',
    contentPath: '.',
    readmeOnly: true,
  },

  // YouTube channels
  {
    id: 'alex-lichter',
    label: 'Alex Lichter',
    type: 'youtube',
    channelId: 'UCqFPgMzGbLjd-MX-h3Z5aQA',
    maxVideos: 100,
  },
]
```

## Source Types

### GitHub Sources

Fetches Markdown documentation from GitHub repositories.

```typescript
interface GitHubSource {
  type: 'github'

  /** Unique identifier */
  id: string

  /** Display name */
  label: string

  /** GitHub repository (owner/repo) */
  repo: string

  /** Branch to fetch from */
  branch: string

  /** Path to content directory */
  contentPath: string

  /** Output directory in snapshot (defaults to id) */
  outputPath?: string

  /** Only fetch README.md */
  readmeOnly?: boolean

  /** Additional repos to merge into same output */
  additionalSyncs?: Array<{
    repo: string
    branch: string
    contentPath: string
  }>
}
```

**Examples:**

```typescript
// Full documentation tree
{
  id: 'nuxt',
  label: 'Nuxt',
  type: 'github',
  repo: 'nuxt/nuxt',
  branch: 'main',
  contentPath: 'docs/content',
  outputPath: 'nuxt',
}

// README only
{
  id: 'ofetch',
  label: 'ofetch',
  type: 'github',
  repo: 'unjs/ofetch',
  branch: 'main',
  contentPath: '.',
  readmeOnly: true,
  outputPath: 'ofetch',
}

// Multiple repos merged into one output
{
  id: 'nuxt-ui',
  label: 'Nuxt UI',
  type: 'github',
  repo: 'nuxt/ui',
  branch: 'v3',
  contentPath: 'docs/content',
  outputPath: 'nuxt-ui',
  additionalSyncs: [
    {
      repo: 'nuxt/ui-pro',
      branch: 'main',
      contentPath: 'docs/content',
    }
  ],
}
```

### YouTube Sources

Fetches video transcripts from YouTube channels.

```typescript
interface YouTubeSource {
  type: 'youtube'

  /** Unique identifier */
  id: string

  /** Display name */
  label: string

  /** YouTube channel ID */
  channelId: string

  /** Maximum videos to fetch (default: 50) */
  maxVideos?: number
}
```

**Output format:**

```markdown
---
title: "Nuxt 4: An Overview"
videoId: TAoTh4DqH6A
channelId: UCqFPgMzGbLjd-MX-h3Z5aQA
publishedAt: 2024-01-15T10:00:00Z
---

# Nuxt 4: An Overview

[Transcript content here...]
```

### Custom Sources (Extensible)

For sources that don't fit the standard patterns:

```typescript
interface CustomSource {
  type: 'custom'

  /** Unique identifier */
  id: string

  /** Display name */
  label: string

  /** Custom fetch function */
  fetchFn: () => Promise<ContentFile[]>
}

interface ContentFile {
  path: string    // Relative path in output
  content: string // Markdown content
}
```

**Example:**

```typescript
{
  id: 'blog-posts',
  label: 'Community Blog',
  type: 'custom',
  fetchFn: async () => {
    const posts = await fetchBlogPosts()
    return posts.map(post => ({
      path: `blog/${post.slug}.md`,
      content: `---
title: ${post.title}
author: ${post.author}
date: ${post.date}
---

${post.content}`,
    }))
  },
}
```

## Adding a New Source

### Step 1: Define the Source

Add to `apps/api/server/utils/sources.ts`:

```typescript
export const SOURCES: Source[] = [
  // ... existing sources

  {
    id: 'my-project',
    label: 'My Project',
    type: 'github',
    repo: 'my-org/my-project',
    branch: 'main',
    contentPath: 'docs',
  },
]
```

### Step 2: Run Sync

Trigger synchronization:

```bash
# Sync all sources
pnpm sync

# Sync specific source
pnpm sync my-project
```

Or via API:

```bash
curl -X POST https://api.savoir.example.com/api/sync/my-project \
  -H "Authorization: Bearer $SAVOIR_API_KEY"
```

### Step 3: Verify

Check the snapshot repository for the new content:

```
content-snapshot-repo/
└── docs/
    └── my-project/
        ├── getting-started.md
        └── api-reference.md
```

## Sync Process

### Nitro Tasks

Content synchronization is handled by Nitro scheduled tasks:

```typescript
// apps/api/server/tasks/sync-content.ts
export default defineTask({
  meta: {
    name: 'sync:content',
    description: 'Synchronize content from all sources',
  },
  async run() {
    for (const source of SOURCES) {
      await syncSource(source)
    }
    await pushToSnapshot()
  },
})
```

### Scheduling

Configure in `nitro.config.ts`:

```typescript
export default defineNitroConfig({
  experimental: {
    tasks: true,
  },
  scheduledTasks: {
    // Sync every 6 hours
    '0 */6 * * *': ['sync:content'],
  },
})
```

### Manual Trigger

```bash
# Via CLI
pnpm sync

# Via API
curl -X POST https://api.savoir.example.com/api/sync \
  -H "Authorization: Bearer $API_KEY"
```

## Content Normalization

All content is normalized to Markdown with consistent structure:

### File Types

| Input | Output |
|-------|--------|
| `.md` | Preserved as-is |
| `.mdx` | Converted to `.md` |
| `.yml`/`.yaml` | Preserved (for frontmatter) |
| `.json` | Preserved (for configs) |
| Other | Ignored |

### Excluded Files

Lock files and non-documentation are automatically excluded:

- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `node_modules/`
- Binary files
- Test files

### Directory Structure

Sources maintain their original hierarchy:

```
GitHub: nuxt/nuxt/docs/content/getting-started/installation.md
  ↓
Snapshot: docs/nuxt/getting-started/installation.md
```

## Snapshot Repository

The snapshot repository is a GitHub repo containing all aggregated content.

### Structure

```
{GITHUB_SNAPSHOT_REPO}/
├── docs/
│   ├── nuxt/
│   │   ├── getting-started/
│   │   │   ├── installation.md
│   │   │   └── configuration.md
│   │   ├── composables/
│   │   │   ├── use-async-data.md
│   │   │   └── use-fetch.md
│   │   └── ...
│   ├── nitro/
│   ├── h3/
│   └── ...
└── youtube/
    ├── alex-lichter/
    │   ├── nuxt-4-overview-TAoTh4DqH6A.md
    │   └── ...
    └── learn-vue/
```

### Configuration

Set via environment variable:

```bash
GITHUB_SNAPSHOT_REPO=my-org/content-snapshot
```

### Updates

The sync process:

1. Fetches content from all sources
2. Transforms and normalizes
3. Commits changes to snapshot repo
4. New sandboxes clone the updated snapshot

## Best Practices

### Source Selection

1. **Prioritize official documentation** over third-party content
2. **Include README-only sources** for smaller libraries
3. **Add YouTube sources** for tutorial content and explanations

### Performance

1. **Batch updates** rather than syncing after each change
2. **Use `readmeOnly`** for packages without full docs
3. **Limit YouTube videos** to prevent excessive API usage

### Content Quality

1. **Preserve frontmatter** for metadata
2. **Maintain original structure** for discoverability
3. **Include version info** in source paths when relevant

## Troubleshooting

### Sync Failures

Check logs for specific errors:

```bash
pnpm sync my-source --verbose
```

Common issues:
- **Rate limits**: Wait and retry, or use authenticated requests
- **Missing content path**: Verify `contentPath` exists in repo
- **Branch not found**: Check `branch` matches repository

### Missing Content

1. Verify source configuration
2. Check if files match allowed extensions
3. Ensure content isn't in excluded files list

### Stale Content

Force a fresh sync:

```bash
pnpm sync --reset
```

Or via API:

```bash
curl -X POST https://api.savoir.example.com/api/sync?reset=true \
  -H "Authorization: Bearer $API_KEY"
```
